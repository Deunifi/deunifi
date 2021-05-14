//SPDX-License-Identifier: UNLICENSED
pragma solidity 0.7.6;
pragma experimental ABIEncoderV2;

import { IUniswapV2Router02 } from '@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol';
import { IUniswapV2Pair } from '@uniswap/v2-core/contracts/interfaces/IUniswapV2Pair.sol';
import { IUniswapV2Callee } from '@uniswap/v2-core/contracts/interfaces/IUniswapV2Callee.sol';

import { ILendingPoolAddressesProvider, FlashLoanReceiverBase } from "./aave/FlashLoanReceiverBase.sol";

import { SafeMath } from "@openzeppelin/contracts/math/SafeMath.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";

import { UnifiLibrary } from "./UnifiLibrary.sol";
import { IFeeManager } from "./IFeeManager.sol";


// // TODO Remove
// import "hardhat/console.sol";

interface IDSProxy{

    function execute(address _target, bytes calldata _data)
        external
        payable;

    function setOwner(address owner_)
        external;

}

interface ILendingPool{
    function flashLoan(
        address receiverAddress,
        address[] calldata assets,
        uint256[] calldata amounts,
        uint256[] calldata modes,
        address onBehalfOf,
        bytes calldata params,
        uint16 referralCode
    ) external;
}

interface IWeth{
    function deposit() external payable;
    function withdraw(uint wad) external;
}

interface IPsm{
    function buyGem(address usr, uint256 gemAmt) external;
}

contract RemovePosition is FlashLoanReceiverBase, Ownable {

    address public feeManager;

    using SafeMath for uint;
    using SafeERC20 for IERC20;

    uint8 public constant WIPE_AND_FREE = 1;
    uint8 public constant LOCK_AND_DRAW = 2;

    constructor(ILendingPoolAddressesProvider provider) FlashLoanReceiverBase(provider) public {
    }

    fallback () external payable {}

    function setFeeManager(address _feeManager) public onlyOwner{
        feeManager = _feeManager;
    }

    struct PayBackParameters {
        address sender;
        address debtToken;
        uint debtToPay;
        address tokenA;
        address tokenB;
        address pairToken;
        uint collateralAmountToFree;
        uint collateralAmountToUseToPayDebt;
        uint debtToCoverWithTokenA;
        uint debtToCoverWithTokenB;
        address[] pathTokenAToDebtToken;
        address[] pathTokenBToDebtToken;
        uint minTokenAToRecive;
        uint minTokenBToRecive;
        uint deadline;
        address dsProxy;
        address dsProxyActions;
        address manager;
        address gemJoin;
        address daiJoin;
        uint cdp;
        address router02;
        address weth;
    }
    
    function lockGemAndDraw(
        address gemToken,
        address dsProxy,
        address dsProxyActions,
        address manager,
        address jug,
        address gemJoin,
        address daiJoin, 
        uint cdp,
        uint collateralToLock,
        uint daiToBorrow,
        bool transferFrom
        ) public {

        UnifiLibrary.safeIncreaseMaxUint(gemToken, dsProxy, collateralToLock);

        IDSProxy(dsProxy).execute(
            dsProxyActions,
            abi.encodeWithSignature("lockGemAndDraw(address,address,address,address,uint256,uint256,uint256,bool)",
                manager, jug, gemJoin, daiJoin, cdp, collateralToLock, daiToBorrow, transferFrom)
        );

    }

    struct LockAndDrawParameters{

        address sender;

        address debtToken;

        address router02;
        address psm;

        address token0;
        uint256 debtTokenForToken0;
        uint256 token0FromDebtToken;
        address[] pathFromDebtTokenToToken0;
        bool usePsmForToken0;

        address token1;
        uint256 debtTokenForToken1;
        uint256 token1FromDebtToken;
        address[] pathFromDebtTokenToToken1;
        bool usePsmForToken1;

        uint256 token0FromUser;
        uint256 token1FromUser;

        uint256 minCollateralToBuy;
        uint256 collateralFromUser;

        address gemToken;
        address dsProxy;
        address dsProxyActions;
        address manager;
        address jug;
        address gemJoin;
        address daiJoin;
        uint256 cdp;
        uint256 debtTokenToDraw;
        bool transferFrom;

        uint256 deadline;

    }

    function approveDebtToken(uint256 pathFromDebtTokenToToken0Length, uint256 pathFromDebtTokenToToken1Length,
        address debtToken, address router02, address psm,
        uint256 debtTokenForToken0, uint256 debtTokenForToken1,
        bool usePsmForToken0, bool usePsmForToken1) internal {
        
        uint256 amountToApproveRouter02 = 0;
        uint256 amountToApprovePsm = 0;

        if (pathFromDebtTokenToToken0Length > 0){
            if (usePsmForToken0)
                amountToApprovePsm = amountToApprovePsm.add(debtTokenForToken0);
            else
                amountToApproveRouter02 = amountToApproveRouter02.add(debtTokenForToken0);
        }

        if (pathFromDebtTokenToToken1Length > 0){
            if (usePsmForToken1)
                amountToApprovePsm = amountToApprovePsm.add(debtTokenForToken1);
            else
                amountToApproveRouter02 = amountToApproveRouter02.add(debtTokenForToken1);
        }

        if (amountToApproveRouter02 > 0){
            UnifiLibrary.safeIncreaseMaxUint(debtToken, router02, 
                amountToApproveRouter02);
        }

        if (amountToApprovePsm > 0){
            UnifiLibrary.safeIncreaseMaxUint(debtToken, psm, 
                amountToApprovePsm);
        }

    }

    function lockAndDrawOperation(bytes memory params) public payable{

        ( LockAndDrawParameters memory parameters) = abi.decode(params, (LockAndDrawParameters));
        
        approveDebtToken(parameters.pathFromDebtTokenToToken0.length, parameters.pathFromDebtTokenToToken1.length,
            parameters.debtToken, parameters.router02, parameters.psm,
            parameters.debtTokenForToken0, parameters.debtTokenForToken1,
            parameters.usePsmForToken0, parameters.usePsmForToken1);

        uint token0FromDebtToken = 0;
        uint token1FromDebtToken = 0;
        uint boughtCollateral;

        // Swap debt token for gems or one of tokens that compose gems.
        if (parameters.debtTokenForToken0 > 0){

            if (parameters.debtToken == parameters.token0){

                token0FromDebtToken = parameters.debtTokenForToken0;

            } else {

                if (parameters.usePsmForToken0){

                    token0FromDebtToken = parameters.token0FromDebtToken;
                    
                    IPsm(parameters.psm).buyGem(address(this), token0FromDebtToken);

                }else{

                    token0FromDebtToken = IUniswapV2Router02(parameters.router02).swapExactTokensForTokens(
                        parameters.debtTokenForToken0, // exact amount for token 'from'
                        0, // min amount to recive for token 'to'
                        parameters.pathFromDebtTokenToToken0, // path of swap
                        address(this), // reciver
                        parameters.deadline
                        )[parameters.pathFromDebtTokenToToken0.length-1];

                }

            }

            boughtCollateral = token0FromDebtToken;

        }

        // Swap debt token the other token that compose gems.
        if (parameters.debtTokenForToken1 > 0){

            if (parameters.debtToken == parameters.token1){

                token1FromDebtToken = parameters.debtTokenForToken1;

            } else {

                if (parameters.usePsmForToken1){

                    token1FromDebtToken = parameters.token1FromDebtToken;
                    
                    IPsm(parameters.psm).buyGem(address(this), token1FromDebtToken);

                }else{

                    token1FromDebtToken = IUniswapV2Router02(parameters.router02).swapExactTokensForTokens(
                        parameters.debtTokenForToken1, // exact amount for token 'from'
                        0, // min amount to recive for token 'to'
                        parameters.pathFromDebtTokenToToken1, // path of swap
                        address(this), // reciver
                        parameters.deadline
                        )[parameters.pathFromDebtTokenToToken1.length-1];

                }

            }

        }

        if (parameters.token1FromUser.add(token1FromDebtToken) > 0){

            UnifiLibrary.safeIncreaseMaxUint(parameters.token0, parameters.router02,
                parameters.token0FromUser.add(token0FromDebtToken));
            UnifiLibrary.safeIncreaseMaxUint(parameters.token1, parameters.router02,
                parameters.token1FromUser.add(token1FromDebtToken));

            ( uint token0Used, uint token1Used, uint addedLiquidity) = IUniswapV2Router02(parameters.router02).addLiquidity(
                parameters.token0,
                parameters.token1,
                parameters.token0FromUser.add(token0FromDebtToken),
                parameters.token1FromUser.add(token1FromDebtToken),
                0,
                0,
                address(this), // reciver
                parameters.deadline
            );

            boughtCollateral = addedLiquidity;

            // Remaining tokens are returned to user.

            if (parameters.token0FromUser.add(token0FromDebtToken).sub(token0Used) > 0)
                IERC20(parameters.token0).safeTransfer(
                    parameters.sender,
                    parameters.token0FromUser.add(token0FromDebtToken).sub(token0Used));

            if (parameters.token1FromUser.add(token1FromDebtToken).sub(token1Used) > 0)
                IERC20(parameters.token1).safeTransfer(
                    parameters.sender,
                    parameters.token1FromUser.add(token1FromDebtToken).sub(token1Used));

        }

        require(boughtCollateral >= parameters.minCollateralToBuy, "Easy Lending: Bought collateral lower than expected collateral to buy.");

        lockGemAndDraw(
            parameters.gemToken,
            parameters.dsProxy,
            parameters.dsProxyActions,
            parameters.manager, 
            parameters.jug,
            parameters.gemJoin,
            parameters.daiJoin, 
            parameters.cdp,
            parameters.collateralFromUser.add(boughtCollateral),
            parameters.debtTokenToDraw,
            parameters.transferFrom
        );

        // Fee Service Payment
        UnifiLibrary.safeIncreaseMaxUint(parameters.debtToken, feeManager, 
            parameters.debtTokenToDraw); // We are passing an amount higher so it is not necessary to calculate the fee.

        if (feeManager!=address(0))
            // TODO parameters.sender could be set to feeManager.owner() to do not pay fees, so it is a better option 
            // to set it in flashLoanFromDSProxy using owner parameter.
            IFeeManager(feeManager).collectFee(parameters.sender, parameters.debtToken, parameters.debtTokenToDraw);

        // Approve lending pool to collect flash loan + fees.
        UnifiLibrary.safeIncreaseMaxUint(parameters.debtToken, address(LENDING_POOL), 
            parameters.debtTokenToDraw); // We are passing an amount higher so it is not necessary to calculate the fee.

    }

    function paybackDebt(PayBackParameters memory parameters) public payable
        returns (uint freeTokenA, uint freeTokenB, uint freePairToken){

        uint debtToPay = parameters.debtToPay;

        UnifiLibrary.wipeAndFreeGem(
            parameters.dsProxy,
            parameters.dsProxyActions,
            parameters.manager,
            parameters.gemJoin,
            parameters.daiJoin,
            parameters.cdp,
            parameters.collateralAmountToFree,
            debtToPay,
            parameters.debtToken
        );

        (uint remainingTokenA, uint remainingTokenB) = UnifiLibrary.swapCollateralForTokens(
            UnifiLibrary.SwapCollateralForTokensParameters(
                parameters.router02,
                parameters.tokenA,
                parameters.tokenB, // Optional in case of Uniswap Pair Collateral
                parameters.pairToken,
                parameters.collateralAmountToUseToPayDebt, // Amount of tokenA or liquidity to remove 
                                    // of pair(tokenA, tokenB)
                parameters.minTokenAToRecive, // Min amount remaining after swap tokenA for debtToken
                            // (this has more sense when we are working with pairs)
                parameters.minTokenBToRecive, // Optional in case of Uniswap Pair Collateral
                parameters.deadline,
                parameters.debtToCoverWithTokenA, // amount in debt token
                parameters.debtToCoverWithTokenB, // Optional in case of Uniswap Pair Collateral
                parameters.pathTokenAToDebtToken, // Path to perform the swap.
                parameters.pathTokenBToDebtToken // Optional in case of Uniswap Pair Collateral
            )
        );

        uint pairRemaining = 0;

        if (parameters.pairToken != address(0)){
            pairRemaining = parameters.collateralAmountToFree
                .sub(parameters.collateralAmountToUseToPayDebt);
        }

        return (remainingTokenA, remainingTokenB, pairRemaining);

    }

    function wipeAndFreeOperation(bytes memory params) internal{

        ( PayBackParameters memory decodedData ) = abi.decode(params, (PayBackParameters));

        (uint remainingTokenA, uint remainingTokenB, uint pairRemaining) = paybackDebt(decodedData);

        // Fee Service Payment
        UnifiLibrary.safeIncreaseMaxUint(decodedData.debtToken, feeManager, 
            decodedData.debtToPay); // We are passing an amount higher so it is not necessary to calculate the fee.

        if (feeManager!=address(0))
            IFeeManager(feeManager).collectFee(decodedData.sender, decodedData.debtToken, decodedData.debtToPay);

        // Conversion from WETH to ETH when needed.
        if (decodedData.weth != address(0)){

            uint wethBalance = 0;

            if (decodedData.tokenA == decodedData.weth){
                wethBalance = remainingTokenA;
                remainingTokenA = 0;
            }

            if (decodedData.tokenB == decodedData.weth){
                wethBalance = remainingTokenB;
                remainingTokenB = 0;
            }

            if (wethBalance>0){
                IWeth(decodedData.weth).withdraw(wethBalance);
                decodedData.sender.call{value: wethBalance}("");
            }
        }

        if (remainingTokenA > 0)
            IERC20(decodedData.tokenA).safeTransfer(decodedData.sender, remainingTokenA);

        if (remainingTokenB > 0)
            IERC20(decodedData.tokenB).safeTransfer(decodedData.sender, remainingTokenB);

        if (pairRemaining > 0)
            IERC20(decodedData.pairToken).safeTransfer(decodedData.sender, pairRemaining);

        // IERC20(decodedData.debtToken).safeIncreaseAllowance(address(LENDING_POOL), premiums[0].add(amounts[0]));
        UnifiLibrary.safeIncreaseMaxUint(decodedData.debtToken, address(LENDING_POOL), 
            decodedData.debtToPay.mul(2)); // We are passing an amount higher so it is not necessary to calculate the fee.

    }

    struct Operation{
        uint8 operation;
        bytes data;
    }

    /**
        This function is called after your contract has received the flash loan amount
     */
    function executeOperation(
        address[] calldata assets,
        uint256[] calldata amounts,
        uint256[] calldata premiums,
        address initiator,
        bytes calldata params
    )
        external
        override
        returns (bool)
    {

        // ( uint8 operation, bytes memory operationData) = abi.decode(params, (uint8, bytes));
        ( Operation memory operation ) = abi.decode(params, (Operation));

        if (operation.operation == WIPE_AND_FREE)
            wipeAndFreeOperation(operation.data);
        else if(operation.operation == LOCK_AND_DRAW)
            lockAndDrawOperation(operation.data);
        else
            revert('Easy Vault: Invalid operation.');

        return true;
    }

    /**
    Executed as DSProxy.
     */
    function flashLoanFromDSProxy(
        address owner, // Owner of DSProxy calling this function.
        address target, // Target contract that will resolve the flash loan.
        address[] memory ownerTokens, // owner tokens to transfer to target
        uint[] memory ownerAmounts, // owner token amounts to transfer to target
        address lendingPool,
        address[] memory loanTokens,
        uint[] memory loanAmounts,
        uint[] memory modes,
        bytes memory data,
        address weth // When has to use or recive ETH, else should be address(0)
        ) public payable{

        if (msg.value > 0){
            IWeth(weth).deposit{value: msg.value}();
            IERC20(weth).safeTransfer(
                target, msg.value
            );
        }

        IDSProxy(address(this)).setOwner(target);

        for (uint i=0; i<ownerTokens.length; i=i.add(1)){
            IERC20(ownerTokens[i]).safeTransferFrom(
                owner, target, ownerAmounts[i]
            );  // TODO ownerTokens[i].connect(owner).approve(DSProxy,MAX)
        }

        ILendingPool(lendingPool).flashLoan(
            target,
            loanTokens,
            loanAmounts,
            modes, // modes: 0 = no debt, 1 = stable, 2 = variable
            target, // onBehalfOf
            data,
            0 // referralCode
        );

        IDSProxy(address(this)).setOwner(owner);
        
    }

}

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

import { UnifiLibrary } from "./UnifiLibrary.sol";

// TODO Remove
import "hardhat/console.sol";

interface IFeeManager{
    function takeFeeFrom(address from, uint gasConsumed) external;
}

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

contract RemovePosition is FlashLoanReceiverBase {

    // address immutable feeManager;

    using SafeMath for uint;
    using SafeERC20 for IERC20;

    constructor(ILendingPoolAddressesProvider provider/*, address _feeManager*/) FlashLoanReceiverBase(provider) public {
        // feeManager = _feeManager;
    }

    struct PayBackParameters {
        address sender;
        address debtToken;
        uint debtToPay;
        uint amountFromSenderInDebtToken; // TODO Verify if applies
        uint amountFromLoanInDebtToken; // TODO Verify if applies
        address tokenA;
        address tokenB;
        address pairToken;
        uint collateralAmountToFree;
        uint collateralAmountToUseToPayDebt;
        uint debtToCoverWithTokenA;
        uint debtToCoverWithTokenB;
        // TODO remove comment and find solution for decoding address[]
        // address[] pathTokenAToDebtToken;
        // address[] pathTokenBToDebtToken;
        uint minTokenAToRecive;
        uint minTokenBToRecive;
        uint loanFee; // TODO Verify if applies
        uint deadline;
        address dsProxy;
        address dsProxyActions;
        address manager;
        address gemJoin;
        address daiJoin;
        uint cdp;
        address router02;
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

        ( PayBackParameters memory decodedData ) = abi.decode(params, (PayBackParameters));

        (uint remainingTokenA, uint remainingTokenB, uint pairRemaining) = paybackDebt(decodedData);

        if (remainingTokenA > 0)
            IERC20(decodedData.tokenA).safeTransfer(decodedData.sender, remainingTokenA);

        if (remainingTokenB > 0)
            IERC20(decodedData.tokenB).safeTransfer(decodedData.sender, remainingTokenB);

        if (pairRemaining > 0)
            IERC20(decodedData.pairToken).safeTransfer(decodedData.sender, remainingTokenB);

        // TODO add feeMannagerTo manage the fee payments.
        // Service fee payment
        IERC20(decodedData.debtToken).safeTransfer(decodedData.sender, decodedData.debtToPay.mul(3).div(10000));

        // Loan fee payment
        // TODO Do dynamic
        // for (uint i=0; i<amounts.length; i=i.add(1)){
        //     IERC20(decodedData.debtToken).safeIncreaseAllowance(address(LENDING_POOL), premiums[i].add(amounts[i]));
        // }
        IERC20(decodedData.debtToken).safeIncreaseAllowance(address(LENDING_POOL), premiums[0].add(amounts[0]));

        // console.log('address(LENDING_POOL)', address(LENDING_POOL));
        // console.log('msg.sender', msg.sender);
        // console.log('decodedData', decodedData.loanFee);
        // console.log('premiums[0]', premiums[0]);
        // console.log('amounts[0]', amounts[0]);
        // console.log('IERC20(decodedData.debtToken).balanceOf(address(this))', IERC20(decodedData.debtToken).balanceOf(address(this)));

        return true;
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

        // TODO Remove once resolved the problem of decoding paths.
        address[] memory pathTokenAToDebtToken = new address[](2);
        pathTokenAToDebtToken[0] = parameters.tokenA;
        pathTokenAToDebtToken[1] = parameters.debtToken;
        address[] memory pathTokenBToDebtToken = new address[](2);
        pathTokenBToDebtToken[0] = parameters.tokenB;
        pathTokenBToDebtToken[1] = parameters.debtToken;

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
                // TODO Use the paths pass as parameters.
                // parameters.pathTokenAToDebtToken, // Path to perform the swap.
                // parameters.pathTokenBToDebtToken // Optional in case of Uniswap Pair Collateral
                pathTokenAToDebtToken, // Path to perform the swap.
                pathTokenBToDebtToken // Optional in case of Uniswap Pair Collateral
            )
        );

        uint pairRemaining = 0;

        if (parameters.pairToken != address(0)){
            pairRemaining = parameters.collateralAmountToFree
                .sub(parameters.collateralAmountToUseToPayDebt);
        }

        return (remainingTokenA, remainingTokenB, pairRemaining);

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
        bytes memory data
        ) public payable{

        uint initialGas = gasleft();

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

        // IFeeManager(feeManager).takeFeeFrom(owner, initialGas-gasleft()); // TODO feeToken.connect(owner).approve(feeManager,MAX)

    }

}

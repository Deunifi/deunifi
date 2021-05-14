//SPDX-License-Identifier: UNLICENSED
pragma solidity 0.7.6;
pragma abicoder v2;

import { IUniswapV2Router02 } from '@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol';
import { IUniswapV2Pair } from '@uniswap/v2-core/contracts/interfaces/IUniswapV2Pair.sol';
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeMath } from "@openzeppelin/contracts/math/SafeMath.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";

// // TODO Remove
// import "hardhat/console.sol";

uint256 constant MAX_UINT256 = ~uint256(0);

interface IDSProxy{

    function execute(address _target, bytes calldata _data)
        external
        payable;

}

interface IPsm{
    function buyGem(address usr, uint256 gemAmt) external;
    function sellGem(address usr, uint256 gemAmt) external;
}

library UnifiLibrary {

    using SafeMath for uint;
    using SafeERC20 for IERC20;

    function safeIncreaseMaxUint(address token, address spender, uint amount) internal {
        if (IERC20(token).allowance(address(this), spender) < amount){
            IERC20(token).safeApprove(spender, 0);
            IERC20(token).safeApprove(spender, MAX_UINT256);
        } 
    }

    /**
    Preconditions:
    - this should have enough `wadD` DAI.
    - DAI.allowance(this, daiJoin) >= wadD
    - All addresses should correspond with the expected contracts.
    */
    function wipeAndFreeGem(
        address dsProxy,
        address dsProxyActions,
        address manager,
        address gemJoin,
        address daiJoin,
        uint256 cdp,
        uint256 wadC,
        uint256 wadD,
        address daiToken
    ) internal {

        safeIncreaseMaxUint(daiToken, dsProxy, wadD);

        IDSProxy(dsProxy).execute(
            dsProxyActions,
            abi.encodeWithSignature("wipeAndFreeGem(address,address,address,uint256,uint256,uint256)",
                manager, gemJoin, daiJoin, cdp, wadC, wadD)
        );

    }
    
    struct SwapCollateralForTokensParameters{
        address router02; // Uniswap V2 Router
        address tokenA; // Token to be swap for debtToken
        address tokenB; // Optional in case of Uniswap Pair Collateral
        address pairToken;
        uint amountToUseToPayDebt; // Amount of tokenA or liquidity to remove 
                                   // of pair(tokenA, tokenB)
        uint amountAMin; // Min amount remaining after swap tokenA for debtToken
                         // (this has more sense when we are working with pairs)
        uint amountBMin; // Optional in case of Uniswap Pair Collateral
        uint deadline;
        uint debtToCoverWithTokenA; // amount in debt token
        uint debtToCoverWithTokenB; // Optional in case of Uniswap Pair Collateral
        address[] pathTokenAToDebtToken; // Path to perform the swap.
        address[] pathTokenBToDebtToken; // Optional in case of Uniswap Pair Collateral

        address tokenToSwapWithPsm;
        address tokenJoinForSwapWithPsm;
        address psm;
        uint256 psmSellGemAmount;
        uint256 expectedDebtTokenFromPsmSellGemOperation;
    }

    /**
    Preconditions:
    - this should have enough amountToUseToPayDebt, 
        tokenA for debtToCoverWithTokenA and 
        tokenb for debtToCoverWithTokenB and 
    - pair(tokenA, tokenB).allowance(this, router02) >= amountToUseToPayDebt.
    - tokenA.allowance(this, router02) >= (debtToCoverWithTokenA in token A)
    - tokenB.allowance(this, router02) >= (debtToCoverWithTokenB in token B)
    - All addresses should correspond with the expected contracts.
    - pair(tokenA, tokenB) should be a valid Uniswap V2 pair.
    */
    function swapCollateralForTokens(
        SwapCollateralForTokensParameters memory parameters
    ) internal returns (uint remainingTokenA, uint remainingTokenB) {
        
        uint amountA = 0;
        uint amountB = 0;
        uint amountACoveringDebt = 0;
        uint amountBCoveringDebt = 0;

        if (parameters.tokenB!=address(0)){

            safeIncreaseMaxUint(parameters.pairToken, parameters.router02, parameters.amountToUseToPayDebt);

            (amountA, amountB) = IUniswapV2Router02(parameters.router02).removeLiquidity(      
                parameters.tokenA,
                parameters.tokenB,
                parameters.amountToUseToPayDebt,
                0, // Min amount of token A to recive
                0, // Min amount of token B to recive
                address(this),
                parameters.deadline
            );

            if (parameters.debtToCoverWithTokenB > 0){
                
                if (parameters.pathTokenBToDebtToken.length == 0){

                    amountBCoveringDebt = parameters.debtToCoverWithTokenB;

                } else {

                    if (parameters.tokenToSwapWithPsm == parameters.tokenB){

                        safeIncreaseMaxUint(parameters.tokenB, parameters.tokenJoinForSwapWithPsm, 
                            parameters.psmSellGemAmount);

                        IPsm(parameters.psm).sellGem(address(this), parameters.psmSellGemAmount);

                        amountBCoveringDebt = parameters.expectedDebtTokenFromPsmSellGemOperation;

                    }else{

                        // IERC20(parameters.tokenB).safeIncreaseAllowance(parameters.router02, amountB.sub(parameters.amountBMin));
                        safeIncreaseMaxUint(parameters.tokenB, parameters.router02, 
                            amountB.mul(2));  // We are passing an amount higher because we do not know how much is going to be spent.
                        
                        amountBCoveringDebt = IUniswapV2Router02(parameters.router02).swapTokensForExactTokens(
                            parameters.debtToCoverWithTokenB,
                            amountB.sub(parameters.amountBMin), // amountInMax (Here we validate amountBMin)
                            parameters.pathTokenBToDebtToken,
                            address(this),
                            parameters.deadline
                        )[0];

                    }

                }

            }

        }else{

            // In case we are not dealing with a pair, we need 
            amountA = parameters.amountToUseToPayDebt;

        }

        if (parameters.debtToCoverWithTokenA > 0){

                if (parameters.pathTokenAToDebtToken.length == 0){

                    amountACoveringDebt = parameters.debtToCoverWithTokenA;

                } else {

                    if (parameters.tokenToSwapWithPsm == parameters.tokenA){

                        safeIncreaseMaxUint(parameters.tokenA, parameters.tokenJoinForSwapWithPsm, 
                            parameters.psmSellGemAmount);

                        IPsm(parameters.psm).sellGem(address(this), parameters.psmSellGemAmount);

                        amountACoveringDebt = parameters.expectedDebtTokenFromPsmSellGemOperation;

                    }else{

                        // IERC20(parameters.tokenA).safeIncreaseAllowance(parameters.router02, amountA.sub(parameters.amountAMin));
                        safeIncreaseMaxUint(parameters.tokenA, parameters.router02,
                            amountA.mul(2)); // We are passing an amount higher because we do not know how much is going to be spent.

                        amountACoveringDebt = IUniswapV2Router02(parameters.router02).swapTokensForExactTokens(
                            parameters.debtToCoverWithTokenA,
                            amountA.sub(parameters.amountAMin), // amountInMax (Here we validate amountAMin)
                            parameters.pathTokenAToDebtToken,
                            address(this),
                            parameters.deadline
                        )[0];

                    }

                }

        }

        return (
            amountA.sub(amountACoveringDebt),
            amountB.sub(amountBCoveringDebt)
            );

    }
}

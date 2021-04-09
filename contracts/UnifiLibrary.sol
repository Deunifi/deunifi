//SPDX-License-Identifier: UNLICENSED
pragma solidity 0.7.6;
pragma abicoder v2;

import { IUniswapV2Router02 } from '@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol';
import { IUniswapV2Pair } from '@uniswap/v2-core/contracts/interfaces/IUniswapV2Pair.sol';
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeMath } from "@openzeppelin/contracts/math/SafeMath.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";

uint256 constant UINT256_MAX = ~uint256(0);

interface IDSProxy{

    function execute(address _target, bytes calldata _data)
        external
        payable;

}

library UnifiLibrary {

    using SafeMath for uint;
    using SafeERC20 for IERC20;

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
    ) external {

        // TODO Do all approvements with MAX_UINT if applyes.
        IERC20(daiToken).safeIncreaseAllowance(daiJoin, wadD);

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
    ) public returns (uint remainingTokenA, uint remainingTokenB) {
        
        uint amountA = 0;
        uint amountB = 0;
        uint amountACoveringDebt = 0;
        uint amountBCoveringDebt = 0;

        if (parameters.tokenB!=address(0)){

            // TODO approveMaxIfNotApproved
            IERC20(parameters.pairToken).safeIncreaseAllowance(parameters.router02, parameters.amountToUseToPayDebt);

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
                
                IERC20(parameters.tokenB).safeIncreaseAllowance(parameters.router02, amountB.sub(parameters.amountBMin));

                amountBCoveringDebt = IUniswapV2Router02(parameters.router02).swapTokensForExactTokens(
                    parameters.debtToCoverWithTokenB,
                    amountB.sub(parameters.amountBMin), // amountInMax (Here we validate amountBMin)
                    parameters.pathTokenBToDebtToken, // TODO if path empty do not have to swap.
                    address(this),
                    parameters.deadline
                )[0];
            }

        }else{

            // In case we are not dealing with a pair, we need 
            amountA = parameters.amountToUseToPayDebt;

        }

        if (parameters.debtToCoverWithTokenA > 0){

            IERC20(parameters.tokenA).safeIncreaseAllowance(parameters.router02, amountA.sub(parameters.amountAMin));

            amountACoveringDebt = IUniswapV2Router02(parameters.router02).swapTokensForExactTokens(
                parameters.debtToCoverWithTokenA,
                amountA.sub(parameters.amountAMin), // amountInMax (Here we validate amountAMin)
                parameters.pathTokenAToDebtToken, // TODO if path empty do not have to swap.
                address(this),
                parameters.deadline
            )[0];

        }

        return (
            amountA.sub(amountACoveringDebt),
            amountB.sub(amountBCoveringDebt)
            );

    }
}

//SPDX-License-Identifier: UNLICENSED
pragma solidity 0.7.6;
pragma experimental ABIEncoderV2;

import { SafeMath } from "@openzeppelin/contracts/math/SafeMath.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";

import { Actions, Account } from "../../money-legos/dydx/ISoloMargin.sol";
import { ICallee } from "../../money-legos/dydx/ICallee.sol";

interface ISoloMargin{

    function operate(
        Account.Info[] memory accounts,
        Actions.ActionArgs[] memory actions
    ) external;

    function getNumMarkets() external view returns (uint256);

    function getMarketTokenAddress(uint256 marketId)
        external
        view
        returns (address);

}

contract SoloMargin is Ownable, ISoloMargin{

    using SafeMath for uint;
    using SafeERC20 for IERC20;

    address public dai;

    constructor (address _dai) Ownable() {
        dai = _dai;
    }

    function getNumMarkets() external view override returns (uint256){

        return 1;

    }

    function getMarketTokenAddress(uint256 marketId)
        external
        view
        override
        returns (address){

        require(marketId == 0, 'Mock SoloMargin: only dai market supported.');
        return dai;

    }

    function operate(
        Account.Info[] memory accounts,
        Actions.ActionArgs[] memory actions
    ) external override {
        
        IERC20(dai).safeTransfer(
                actions[0].otherAddress, actions[0].amount.value
            );

        ICallee(actions[0].otherAddress).callFunction(
            msg.sender,
            accounts[0],
            actions[1].data
        );

        IERC20(dai).safeTransferFrom(
            actions[2].otherAddress, address(this), actions[0].amount.value.add(2)
        );

    }

    function withdraw(address token, address to, uint amount) public onlyOwner{
        if (token == address(0))
            to.call{value: amount}("");
        else
            IERC20(token).safeTransfer(to, amount);
    }

}


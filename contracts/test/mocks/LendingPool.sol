//SPDX-License-Identifier: UNLICENSED
pragma solidity 0.7.6;

import { ILendingPool } from "../../ILendingPool.sol";

import { SafeMath } from "@openzeppelin/contracts/math/SafeMath.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";

interface IFlashLoanReceiver{

    function executeOperation(
        address[] calldata assets,
        uint256[] calldata amounts,
        uint256[] calldata premiums,
        address initiator,
        bytes calldata params
    )
        external
        returns (bool);
}

contract LendingPool is Ownable, ILendingPool{

    using SafeMath for uint;
    using SafeERC20 for IERC20;

    function withdraw(address token, address to, uint amount) public onlyOwner{
        if (token == address(0))
            to.call{value: amount}("");
        else
            IERC20(token).safeTransfer(to, amount);
    }

    function flashLoan(
        address receiverAddress,
        address[] calldata assets,
        uint256[] calldata amounts,
        uint256[] calldata modes,
        address onBehalfOf,
        bytes calldata params,
        uint16 referralCode
    ) external override{

        uint256[] memory premiums = new uint256[](assets.length);

        for (uint i=0; i<assets.length; i=i.add(1)){
            IERC20(assets[i]).safeTransfer(
                receiverAddress, amounts[i]
            );
            // TODO Use fee from AAVE LendingPool
            premiums[i] = amounts[i].mul(9).div(10000); 
        }

        IFlashLoanReceiver(receiverAddress).executeOperation(assets, amounts, premiums, msg.sender, params);

        for (uint i=0; i<assets.length; i=i.add(1)){
            IERC20(assets[i]).safeTransferFrom(
                receiverAddress, address(this), amounts[i].add(premiums[i])
            );
        }

    }

    function FLASHLOAN_PREMIUM_TOTAL()
        external view override
        returns(uint256){

        return 9;

    }
}


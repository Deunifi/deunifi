pragma solidity 0.7.6;

import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { SafeMath } from "@openzeppelin/contracts/math/SafeMath.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import { IFeeManager } from "./IFeeManager.sol";
import "hardhat/console.sol";

contract FeeManager is IFeeManager, Ownable{

    uint feeRatio;
    using SafeERC20 for IERC20;
    using SafeMath for uint;

    constructor(uint _feeRatio) Ownable() public{
        setFeeRatio(_feeRatio);
    }

    function setFeeRatio(uint _feeRatio) public onlyOwner{
        feeRatio = _feeRatio;
    }

    function withdraw(address token, address to, uint amount) public onlyOwner{
        if (token == address(0))
            to.call{value: amount}("");
        else
            IERC20(token).safeTransfer(to, amount);
    }

    // TODO Add sender as param.
    function getFee(uint amount) public view returns (uint){
        // TODO Verify if owner() it is sender.
        return amount.mul(feeRatio).div(10000);
    }

    // TODO Add sender as param.
    function collectFee(address debtToken, uint baseAmount) external override {
        uint fee = getFee(baseAmount);
        if (fee>0)
            IERC20(debtToken).safeTransferFrom(msg.sender, address(this), fee);
    }

}
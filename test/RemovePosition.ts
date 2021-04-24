import * as hre from "hardhat"
import { expect } from "chai";
import { ethers, deployments } from "hardhat";
import { encodeParamsForRemovePosition } from "../frontend/src/utils/format"
import { BigNumber } from "@ethersproject/bignumber";

describe("RemovePosition", function () {
  
  it("Should change the DSProxy owner during execution to the contract executor.", async function () {

    await deployments.fixture()

    const removePosition = await hre.ethers.getContract('RemovePosition')

    const {deployer, other} = await ethers.getNamedSigners()

  });
});

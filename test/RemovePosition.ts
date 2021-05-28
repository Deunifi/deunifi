import * as hre from "hardhat"
import { expect } from "chai";
import { ethers, deployments } from "hardhat";
import { encodeParamsForWipeAndFree } from "../frontend/src/utils/format"
import { BigNumber } from "@ethersproject/bignumber";

describe("Deunifi", function () {
  
  it("Should change the DSProxy owner during execution to the contract executor.", async function () {

    await deployments.fixture()

    const deunifi = await hre.ethers.getContract('Deunifi')

    const {deployer, other} = await ethers.getNamedSigners()

  });
});

import { expect } from "chai";
import { ethers, deployments } from "hardhat";
import { Greeter } from "../frontend/src/hardhat/types/Greeter"

describe("Greeter", function () {
  it("Should return the new greeting once it's changed", async function () {

    await deployments.fixture()

    const greeter = (await ethers.getContract('Greeter')) as Greeter

    expect(await greeter.greet()).to.equal("Hi!");

    await greeter.setGreeting("Hola, mundo!");
    expect(await greeter.greet()).to.equal("Hola, mundo!");
  });
});

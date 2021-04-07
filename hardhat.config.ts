import { task } from "hardhat/config";
import "@nomiclabs/hardhat-waffle";
import 'hardhat-deploy';
import "hardhat-typechain";

import "./tasks/utils"

// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task("accounts", "Prints the list of accounts", async (args, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(await account.address);
  }
});

task("use-external-contract", "Get an external contract.", async (args, hre) => {

  const uniswapV2Factory = await hre.ethers.getContract('UniswapV2Factory')
  console.log('uniswapV2Factory', uniswapV2Factory.address);
});


import { HardhatUserConfig } from "hardhat/config";

const config: HardhatUserConfig = {

  networks: {
    hardhat: {
      chainId: 1337,
      allowUnlimitedContractSize: true,
      live: false
    },
  },

  solidity: "0.7.3",

  namedAccounts: {
    deployer:{
      default: 0
    }
  },

  paths:{
    deployments: 'frontend/src/hardhat/deployments',
  },

  typechain:{
    outDir: 'frontend/src/hardhat/types',
  }

};

export default config;

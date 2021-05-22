import 'hardhat-deploy';
import "@nomiclabs/hardhat-ethers";
import { task } from "hardhat/config";
import "@nomiclabs/hardhat-waffle";
import "hardhat-gas-reporter"

import { kovan, hardhat, etherscan, mainnet, mainnetForked } from "./private"

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
      // gas: 12000000,
      // blockGasLimit: 0x1fffffffffffff,
      chainId: 1337,
      // throwOnTransactionFailures: true,
      // throwOnCallFailures: true,
      allowUnlimitedContractSize: true,
      live: false,
      hardfork: 'berlin',
    },
    kovan: {
      url: kovan.url,
      accounts: kovan.accounts,
      gas: 2500000,
      gasPrice: 5000000000,
      live: false,
      chainId: 42,
      timeout: 60000
    },
    mainnet: {
      url: mainnet.url.alchemy,
      // accounts: mainnet.accounts,
      gas: 2500000,
      gasPrice: 2000000000,
      live: true,
      chainId: 1
    },
  },

  solidity: {
    compilers:[
      {
        version: "0.7.6"
      },
      {
        version: "0.6.6"
      },
      {
        version: "0.5.12"
      },
    ]
  },

  namedAccounts: {
    deployer:{
      default: 0
    },
    other:{
      default: 3
    }
  },

  paths:{
    deployments: 'frontend/src/hardhat/deployments',
  },

  gasReporter: {
    currency: 'CHF',
    gasPrice: 21,
    enabled: true,
  },

};

export default config;

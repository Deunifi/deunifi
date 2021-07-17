import { task } from "hardhat/config";
import { default as fetch } from 'node-fetch';
import { etherscan } from "../private";
import { TransactionResponse } from "@ethersproject/abstract-provider";

import * as fs from "fs"
import { BigNumber } from "ethers";
import { formatUnits } from "ethers/lib/utils";

task(
    "gastrack",
    "Etherscan gas tracker.",
    async ({ }, hre) => {

        const res = await fetch(`https://api.etherscan.io/api?module=gastracker&action=gasoracle&apikey=${etherscan.mainnet.apiKey}`, {
            compress: false,
        })

        const body = await res.json()

        console.log(body);

    })

task(
    "register-external-deployment",
    "Save the ABI obtained from etherscan, using ${address}, into contracts/abi/${filename}.json file.",
    async ({ name, address, abiaddress }, hre) => {

        const { deployments, network } = hre



        const abiAddress = abiaddress ? abiaddress : address
        const res = await fetch(`https://${etherscan[network.name].domain}/api?apiKey=${etherscan[network.name].apiKey}&module=contract&action=getabi&address=${abiAddress}`, {
            compress: false,
        })

        const body = await res.json()

        const dirname = `external/deployments/${network.name}`

        const content = JSON.stringify({
            name,
            address,
            abi: JSON.parse(body.result),
        }, null, 4)

        fs.writeFileSync(`${dirname}/${name}.json`, content);

    }
)
    .addParam("name", "Contract name.")
    .addParam("address", "The address of the contract in mainnet.")
    .addOptionalParam("abiaddress", "The address use to obtain tha abi.")

const ONE_GWEI = 1000000000

task(
    "set-fee-manager",
    "Sets fee manager.",
    async ({ gasprice, nonce }, hre) => {

        const { deployments, network } = hre

        try {
            const feeManager = await hre.ethers.getContract('FeeManager')
            const deunifi = await hre.ethers.getContract('Deunifi')
            if ((await deunifi.feeManager()) != feeManager.address){
                const transactionResponse: TransactionResponse = await deunifi.setFeeManager(feeManager.address, {gasPrice: gasprice*ONE_GWEI, nonce})
                console.log(`Setting FeeManager (${feeManager.address}) in Unifi contract in transaction ${transactionResponse.hash}.`);
                await transactionResponse.wait(1)    
            }
        } catch (error) {
            console.error(error);
        }
    
    }
)
.addParam("gasprice", "Gas proce in gwei.")
.addOptionalParam("nonce", "Nonce to use.")

task(
    "remove-fee-manager",
    "Removes fee manager.",
    async ({ gasprice }, hre) => {

        const { deployments, network } = hre

        try {
            const deunifi = await hre.ethers.getContract('Deunifi')
            if ((await deunifi.feeManager()) != hre.ethers.constants.Zero){
                const transactionResponse: TransactionResponse = await deunifi.setFeeManager(hre.ethers.constants.AddressZero, {gasPrice: gasprice*ONE_GWEI})
                console.log(`Setting FeeManager (${hre.ethers.constants.AddressZero}) in Unifi contract in transaction ${transactionResponse.hash}.`);
                await transactionResponse.wait(1)
            }
        } catch (error) {
            console.error(error);
        }

    }
)
.addParam("gasprice", "Gas proce in gwei.")

task(
    "fee-manager-balance",
    "Gets fee manager balance.",
    async ({ }, hre) => {

        const { deployments, network } = hre

        try {
            const feeManager = await hre.ethers.getContract('FeeManager')
            const dai = await hre.ethers.getContract('Dai')
            console.log(hre.ethers.utils.formatEther(await dai.balanceOf(feeManager.address)))
        } catch (error) {
            console.error(error);
        }

    }
)

task(
    "fee-manager-withdraw",
    "Withdraw fee manager balance.",
    async ({ }, hre) => {

        const { deployments, network } = hre

        const { deployer } = await hre.ethers.getNamedSigners();

        try {
            const feeManager = await hre.ethers.getContract('FeeManager')
            const dai = await hre.ethers.getContract('Dai')
            await feeManager.connect(deployer).withdraw(dai.address, deployer.address, await dai.balanceOf(feeManager.address))
        } catch (error) {
            console.error(error);
        }

    }
)

task(
    "manager-set-fee",
    "Sets the manager fee.",
    async ({ gasprice, fee }, hre) => {

        const { deployments, network } = hre

        try {
            const feeManager = await hre.ethers.getContract('FeeManager')
            const transactionResponse: TransactionResponse = await feeManager.setFeeRatio(BigNumber.from(fee), {gasPrice: gasprice*ONE_GWEI})
            console.log(`Setting fee ${formatUnits(BigNumber.from(fee), 4)} to FeeManager (${feeManager.address}) in transaction ${transactionResponse.hash}.`);
            await transactionResponse.wait(1)    
        } catch (error) {
            console.error(error);
        }
    
    }
)
.addParam("fee", "Fee. 1 means 0.01 %.")
.addParam("gasprice", "Gas proce in gwei.")

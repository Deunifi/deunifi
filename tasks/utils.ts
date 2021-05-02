import { task } from "hardhat/config";
import { default as fetch } from 'node-fetch';
import { etherscan } from "../private";
import { TransactionResponse } from "@ethersproject/abstract-provider";

import * as fs from "fs"

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

task(
    "set-fee-manager",
    "Sets fee manager.",
    async ({ }, hre) => {

        const { deployments, network } = hre

        try {
            const feeManager = await hre.ethers.getContract('FeeManager')
            const unifi = await hre.ethers.getContract('RemovePosition')
            if ((await unifi.feeManager()) != feeManager.address){
                const transactionResponse: TransactionResponse = await unifi.setFeeManager(feeManager.address)
                console.log(`Setting FeeManager (${feeManager.address}) in Unifi contract in transaction ${transactionResponse.hash}.`);
                await transactionResponse.wait(1)    
            }
        } catch (error) {
            console.error(error);
        }
    
    }
)

task(
    "remove-fee-manager",
    "Removes fee manager.",
    async ({ }, hre) => {

        const { deployments, network } = hre

        try {
            const unifi = await hre.ethers.getContract('RemovePosition')
            if ((await unifi.feeManager()) != hre.ethers.constants.Zero){
                const transactionResponse: TransactionResponse = await unifi.setFeeManager(hre.ethers.constants.AddressZero)
                console.log(`Setting FeeManager (${hre.ethers.constants.AddressZero}) in Unifi contract in transaction ${transactionResponse.hash}.`);
                await transactionResponse.wait(1)
            }
        } catch (error) {
            console.error(error);
        }

    }
)

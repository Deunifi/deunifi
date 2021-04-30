import { task } from "hardhat/config";
import { default as fetch } from 'node-fetch';
import { etherscan } from "../private";

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

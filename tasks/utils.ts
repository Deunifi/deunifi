import { task } from "hardhat/config";
import { default as fetch } from 'node-fetch';
import { etherscan } from "../private";

import * as fs from "fs"

task(
    "gastrack",
    "Etherscan gas tracker.",
    async ({ }, hre) => {

        const res = await fetch(`https://api.etherscan.io/api?module=gastracker&action=gasoracle&apikey=${etherscan.apiKey}`, {
            compress: false,
        })

        const body = await res.json()

        console.log(body);

    })

task(
    "register-deployment",
    "Save the ABI obtained from etherscan, using ${address}, into contracts/abi/${filename}.json file.",
    async ({ name, address, abiaddress, networkname }, hre) => {

        const abiAddress = abiaddress ? abiaddress : address
        const res = await fetch(`https://api.etherscan.io/api?apiKey=${etherscan.apiKey}&module=contract&action=getabi&address=${abiAddress}`, {
            compress: false,
        })

        const body = await res.json()

        const dirname = `${hre.config.paths.deployments}/${networkname}`

        const content = JSON.stringify({
            address,
            abi: JSON.parse(body.result),
        }, null, 4)

        fs.writeFileSync(`${dirname}/${name}.json`, content);

    }
)
    .addParam("name", "Contract name.")
    .addParam("address", "The address of the contract in mainnet.")
    .addOptionalParam("abiaddress", "The address use to obtain tha abi.")
    .addParam("networkname", "Network where is going to be registered the existant deployment.")

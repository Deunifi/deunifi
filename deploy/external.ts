import { DeployFunction } from "hardhat-deploy/dist/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import * as fs from "fs"

const ONE_MILLON = 1000000

let deploy = async function deploy(hre: HardhatRuntimeEnvironment) {

    const {
        deployments,
    } = hre;

    const folderForNetwork = `external/deployments/${hre.network.name}`;

    fs.readdirSync(folderForNetwork).forEach(file => {
        const fileContent = fs.readFileSync(`${folderForNetwork}/${file}`)
        const { name, address, abi } = JSON.parse(fileContent.toString())

        deployments.save(name, {
            address,
            abi
        })
        // console.log(`reusing "${name}" (external) at ${address}`);
        
    });

} as DeployFunction;

deploy.tags = ['external']

deploy.skip = async (env: HardhatRuntimeEnvironment) => {
    return false
}

export default deploy;
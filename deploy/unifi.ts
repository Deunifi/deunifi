import { DeployFunction } from "hardhat-deploy/dist/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { TransactionResponse } from "@ethersproject/abstract-provider";

const ONE_MILLON = 1000000

let deploy = async function deploy(hre: HardhatRuntimeEnvironment) {

    const {
        getNamedAccounts,
        deployments,
    } = hre;

    const { deploy } = deployments;

    const { deployer } = await getNamedAccounts();

    await deploy('Deunifi', {
        from: deployer,
        gasLimit: 5000000,
        args: [],
    });

} as DeployFunction;

deploy.tags = [ 'unifi', ]

deploy.dependencies = [ 'mocks', ]

deploy.skip = async (env: HardhatRuntimeEnvironment) => {
    return env.network.live
}

export default deploy;
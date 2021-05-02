import { DeployFunction } from "hardhat-deploy/dist/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { BigNumber } from "@ethersproject/bignumber";

const ONE_MILLON = 1000000

let deploy = async function deploy(hre: HardhatRuntimeEnvironment) {

    const {
        getNamedAccounts,
        deployments,
    } = hre;

    const { deploy } = deployments;

    const { deployer } = await getNamedAccounts();

    const deployResult = await deploy('FeeManager', {
        from: deployer,
        gasLimit: 4000000,
        args: [BigNumber.from(3)]
    });

} as DeployFunction;

deploy.tags = ['fee']

deploy.dependencies = [ 'mocks' ]

deploy.skip = async (env: HardhatRuntimeEnvironment) => {
    return env.network.live
}

export default deploy;
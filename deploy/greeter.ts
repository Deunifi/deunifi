import { DeployFunction } from "hardhat-deploy/dist/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const ONE_MILLON = 1000000

let deploy = async function deploy(hre: HardhatRuntimeEnvironment) {

    const {
        getNamedAccounts,
        deployments,
    } = hre;

    const { deploy } = deployments;

    const { deployer } = await getNamedAccounts();

    await deploy('Greeter', {
        from: deployer,
        gasLimit: 4000000,
        args: ['Hi!'],
    });

} as DeployFunction;

deploy.tags = []

deploy.skip = async (env: HardhatRuntimeEnvironment) => {
    return true
}

export default deploy;
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

    const unifiLibrary = await deploy("UnifiLibrary", {
        from: deployer
    });

    const lendingPoolAddressesProvider = await hre.ethers.getContract('LendingPoolAddressesProvider')

    await deploy('RemovePosition', {
        from: deployer,
        gasLimit: 4000000,
        args: [lendingPoolAddressesProvider.address], //TODO Add feeTo parameter
        libraries:{
            UnifiLibrary: unifiLibrary.address,
        }
    });

} as DeployFunction;

deploy.tags = []

deploy.dependencies = [ 'mocks' ]

deploy.skip = async (env: HardhatRuntimeEnvironment) => {
    return env.network.live
}

export default deploy;
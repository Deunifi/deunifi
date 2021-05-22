import { DeployFunction } from "hardhat-deploy/dist/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

let deploy = async function deploy(hre: HardhatRuntimeEnvironment) {

    const {
        getNamedAccounts,
        deployments,
    } = hre;

    const { deploy } = deployments;

    const { deployer } = await getNamedAccounts();

    await deploy('LendingPoolAddressesProvider', {
        from: deployer,
        gasLimit: 9000000,
        args: [ hre.ethers.constants.AddressZero ]
    });

} as DeployFunction;

deploy.tags = [ 'mocks' ]

deploy.skip = async (env: HardhatRuntimeEnvironment) => {
    // We only create mock for hardhat network.
    return (env.network.name !== 'hardhat')
}

export default deploy;
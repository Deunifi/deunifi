import { DeployFunction } from "hardhat-deploy/dist/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

let deploy = async function deploy(hre: HardhatRuntimeEnvironment) {

    const {
        getNamedAccounts,
        deployments,
    } = hre;

    const { deploy } = deployments;

    const { deployer } = await getNamedAccounts();

    const dai = await hre.ethers.getContract('Dai')

    const soloMargin = await deploy('SoloMargin', {
        from: deployer,
        gasLimit: 9000000,
        args: [ dai.address ]
    });

    const lendingPoolDeployment = await deploy('LendingPool', {
        from: deployer,
        gasLimit: 9000000,
        args: [ ]
    });

    await deploy('LendingPoolAddressesProvider', {
        from: deployer,
        gasLimit: 9000000,
        args: [ lendingPoolDeployment.address ]
    });

} as DeployFunction;

deploy.tags = [ 'mocks' ]

deploy.skip = async (env: HardhatRuntimeEnvironment) => {
    // We only create mock for hardhat network.
    return (env.network.name !== 'kovan')
}

export default deploy;
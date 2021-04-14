import { DeployFunction } from "hardhat-deploy/dist/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

let deploy = async function deploy(hre: HardhatRuntimeEnvironment) {

    const {
        getNamedAccounts,
        deployments,
    } = hre;

    const { deploy } = deployments;

    const { deployer } = await getNamedAccounts();

    await deploy('DssProxyActions', {
        from: deployer,
        gasLimit: 9000000,
        args: [],
    });

    const uniswapV2Factory = await hre.ethers.getContract('UniswapV2Factory')
    const weth = await hre.ethers.getContract('WETH')

    await deploy('UniswapV2Router02', {
        from: deployer,
        gasLimit: 9000000,
        args: [uniswapV2Factory.address, weth.address, ]
    });

} as DeployFunction;

deploy.tags = []

deploy.skip = async (env: HardhatRuntimeEnvironment) => {
    return env.network.live
}

export default deploy;
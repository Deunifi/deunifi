import { BigNumber } from '@ethersproject/bignumber';
import { Contract } from '@ethersproject/contracts';
import { formatBytes32String } from '@ethersproject/strings';
import { formatEther, formatUnits, parseEther, parseUnits } from '@ethersproject/units';
import { ethers } from 'ethers';
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useEffectAsync } from '../hooks/useEffectAsync';
import { useProvider } from './Connection';
import { useContract } from './Deployments';
import { useVaultContext } from './VaultSelection';

interface Props { }

const ONE_WAD = parseEther('1')
const ONE_RAY = parseUnits('1', 27)

/**
 * 
 * @param ink Collateral amount in WAD.
 * @param dart Normalized debt in WAD.
 * @param price Collateral price in RAY.
 * @returns Collateralization ratio in WAD.
 */
export const getCollateralizationRatio = (ink: BigNumber, dart: BigNumber, price: BigNumber): BigNumber => {
    return dart.isZero() ?
        BigNumber.from(0)
        : ink
            .mul(price).mul(ONE_WAD)
            .div(ONE_RAY).div(dart)
}

/**
 * 
 * @param ink Collateral amount in WAD.
 * @param dart Normalized debt in WAD.
 * @param mat Liquidation ratio in RAY.
 * @returns Liquidation price in RAY.
 */
export const getLiquidationPrice = (ink: BigNumber, dart: BigNumber, mat: BigNumber) => {
    return dart.isZero() ?
        BigNumber.from(0)
        : mat
            .mul(dart)
            .div(ink)
}


interface ITokenInfo {
    contract: Contract,
    symbol: string,
    decimals: number,
}

export interface IVaultInfo {
    cdp: BigNumber,
    urn: string, // Urn address of vault in Vat
    ink: BigNumber, // Collateral in WAD
    dart: BigNumber, // Dai debt in WAD
    spot: BigNumber, // Liquidation price in RAY
    mat: BigNumber, // Liquidation ratio in RAY
    price: BigNumber, // Market price in RAY
    collateralizationRatio: BigNumber, // in WAD
    liquidationPrice: BigNumber, // in WAD
    ilkInfo: {
        ilk: string,
        name: string,
        symbol: string,
        dec: BigNumber,
        gem?: Contract,
        gemJoin?: Contract,
        univ2Pair?: Contract,
        token0?: ITokenInfo,
        token1?: ITokenInfo,
    }
}

export const emptyVaultInfo: IVaultInfo = {
    cdp: BigNumber.from(0),
    urn: "",
    ink: BigNumber.from(0),
    dart: BigNumber.from(0),
    spot: BigNumber.from(0), // Liquidation price in RAY
    mat: BigNumber.from(0), // Liquidation ratio in RAY
    price: BigNumber.from(0),
    collateralizationRatio: BigNumber.from(0),
    liquidationPrice: BigNumber.from(0),
    ilkInfo: {
        ilk: '',
        name: '',
        symbol: '',
        dec: BigNumber.from(0),
    }
}

const VaultInfoContext = createContext<{ vaultInfo: IVaultInfo }>({ vaultInfo: emptyVaultInfo })
const { Provider } = VaultInfoContext

export const useVaultInfoContext = () => useContext(VaultInfoContext)

const getTokenInfo = async (erc20: Contract, address: string): Promise<ITokenInfo> => {
    const contract = erc20.attach(address)
    const symbol = await contract.symbol()
    const decimals = await contract.decimals()
    return {
        contract,
        symbol,
        decimals
    }
}

export const VaultInfo: React.FC<Props> = ({ children }) => {

    const { vault } = useVaultContext()

    const manager = useContract('DssCdpManager')
    const vat = useContract('Vat')
    const spotter = useContract('Spotter')
    const ilkRegistry = useContract('IlkRegistry')
    const gem = useContract('Gem')
    const gemJoin = useContract('Join')
    const uniswapV2Pair = useContract('UniswapV2Pair')
    
    // TODO Decide if PIP is going to be used or calculation using spot and mat.
    const pip = useContract('Pip')
    const provider = useProvider()

    const [vaultInfo, setVaultInfo] = useState<IVaultInfo>(emptyVaultInfo)

    useEffectAsync(async () => {

        if (!vault || !manager || !vat || !spotter || !ilkRegistry || !gem || !gemJoin ||
            !uniswapV2Pair || !pip || !provider) {
            setVaultInfo(emptyVaultInfo)
            return
        }

        const urn = await manager.urns(vault.cdp);

        const bytes32Ilk = formatBytes32String(vault.ilk)


        const [name, symbol, dec, gemAddress, , joinAddress]
            : [string, string, BigNumber, string, any, string]
            = await ilkRegistry.info(bytes32Ilk)

        const { spot, rate }: { spot: BigNumber, rate: BigNumber } = await vat.ilks(bytes32Ilk)

        const { ink, art }: { ink: BigNumber, art: BigNumber } = await vat.urns(bytes32Ilk, urn)

        const dart = art.isZero() ? art : art.mul(rate).div(ONE_RAY).add(1)

        const ilk = await spotter.ilks(bytes32Ilk)
        const { mat, pip: pipAddress }: { mat: BigNumber, pip: string } = ilk

        const collateralPip = pip.attach(pipAddress)

        let price: BigNumber = ethers.constants.Zero
        
        try {
            // TODO Decide if PIP is going to be used or calculation using spot and mat.

            const getPrice = async (
                provider: ethers.providers.Web3Provider, pipAddress: string, 
                storageAddress: string): Promise<BigNumber> => {

                const storageData = await provider.getStorageAt(pipAddress, storageAddress)
                const offset = 34
                const hexStringPrice = storageData.substring(offset,offset+32)

                const price = BigNumber.from('0x'+hexStringPrice).mul(parseUnits('1', 27-18))
                return price
            }

            const currentPrice = await getPrice(provider, pipAddress, '0x3')
            console.log('Current price', formatUnits(currentPrice, 27))
            const queuedPrice = await getPrice(provider, pipAddress, '0x4')
            console.log('Queued price', formatUnits(queuedPrice, 27))

            price = currentPrice

        } catch (e) {

            price = spot.mul(mat).div(ONE_RAY)    

        }

        price = spot.mul(mat).div(ONE_RAY)    

        const collateralizationRatio = getCollateralizationRatio(ink, dart, price)

        const liquidationPrice = getLiquidationPrice(ink, dart, mat)


        let univ2Pair: Contract | undefined = uniswapV2Pair.attach(gemAddress)
        let token0, token1: ITokenInfo | undefined;

        try {
            token0 = await getTokenInfo(gem, await univ2Pair.token0())
            token1 = await getTokenInfo(gem, await univ2Pair.token1())
        } catch (error) {
            univ2Pair = undefined
        }

        setVaultInfo({
            cdp: vault.cdp,
            urn,
            ink,
            dart,
            price,
            spot,
            mat,
            collateralizationRatio,
            liquidationPrice,
            ilkInfo: {
                ilk: vault.ilk,
                name,
                symbol,
                dec,
                gem: gem.attach(gemAddress),
                gemJoin: gemJoin.attach(joinAddress),
                univ2Pair,
                token0,
                token1
            }
        })

    }, [vault, manager, vat, spotter])

    return (
        <div>
            <ul>
                <li>#{vault?.cdp.toString()}</li>
                <li>Ilk: {vault?.ilk}</li>
                <li>Ink: {/*TODO Check if it is correct the number of decimals*/formatEther(vaultInfo.ink)}</li>
                <li>Dart: {vaultInfo?.dart ? formatEther(vaultInfo.dart) : 0}</li>
                <li>Price: {/*TODO Check if it is correct the number of decimals*/formatUnits(vaultInfo.price, 27)}</li>
                <li>Liquidation Price: {/*TODO Check if it is correct the number of decimals*/formatUnits(vaultInfo.liquidationPrice, 27)}</li>
                <li>Collateralization Ratio: {/*TODO Check if it is correct the number of decimals*/formatEther(vaultInfo.collateralizationRatio)}</li>
                <li>Liquidation Ratio: {/*TODO Check if it is correct the number of decimals*/formatUnits(vaultInfo.mat, 27)}</li>
            </ul>
            <Provider value={{ vaultInfo }}>
                {children}
            </Provider>

        </div>

    )
}
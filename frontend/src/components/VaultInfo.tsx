import { BigNumber } from '@ethersproject/bignumber';
import { formatBytes32String } from '@ethersproject/strings';
import { formatEther, formatUnits, parseEther, parseUnits } from '@ethersproject/units';
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useEffectAsync } from '../hooks/useEffectAsync';
import { useContract } from './Deployments';
import { useVaultContext, VaultSelection } from './VaultSelection';

interface Props { }

const ONE_WAD = parseEther('1')
const ONE_RAY = parseUnits('1', 27)

export interface IVaultInfo {
    urn: string, // Urn address of vault in Vat
    ink: BigNumber, // Collateral in WAD
    dart: BigNumber, // Dai debt in WAD
    spot: BigNumber, // Liquidation price in RAY
    mat: BigNumber, // Liquidation ratio in RAY
    price: BigNumber, // Market price in RAY
    collateralizationRatio: BigNumber, // in WAD
    liquidationPrice: BigNumber, // in WAD
}

export const emptyVaultInfo = {
    urn: "",
    ink: BigNumber.from(0),
    dart: BigNumber.from(0),
    spot: BigNumber.from(0), // Liquidation price in RAY
    mat: BigNumber.from(0), // Liquidation ratio in RAY
    price: BigNumber.from(0),
    collateralizationRatio: BigNumber.from(0),
    liquidationPrice: BigNumber.from(0),
}

const VaultInfoContext = createContext<{ vaultInfo: IVaultInfo }>({ vaultInfo: emptyVaultInfo })
const { Provider } = VaultInfoContext

export const useVaultInfoContext = () => useContext(VaultInfoContext)

export const VaultInfo: React.FC<Props> = ({children}) => {

    const { vault } = useVaultContext()

    const manager = useContract('DssCdpManager')
    const vat = useContract('Vat')
    const spotter = useContract('Spotter')

    const [vaultInfo, setVaultInfo] = useState<IVaultInfo>(emptyVaultInfo)

    useEffectAsync(async () => {

        if (!vault || !manager || !vat || !spotter) {
            setVaultInfo(emptyVaultInfo)
            return
        }

        const urn = await manager.urns(vault.cdp);

        const bytes32Ilk = formatBytes32String(vault.ilk)

        const { spot, rate }: { spot: BigNumber, rate: BigNumber } = await vat.ilks(bytes32Ilk)

        const { ink, art }: { ink: BigNumber, art: BigNumber } = await vat.urns(bytes32Ilk, urn)

        const dart = art.isZero() ? art : art.mul(rate).div(ONE_RAY).add(1)

        const { mat }: { mat: BigNumber } = await spotter.ilks(bytes32Ilk)

        const price = spot.mul(mat).div(ONE_RAY)

        const collateralizationRatio = dart.isZero() ?
            BigNumber.from(0)
            : ink
                .mul(price).mul(ONE_WAD)
                .div(ONE_RAY).div(dart)

        const liquidationPrice = dart.isZero() ?
            BigNumber.from(0)
            : price
                .mul(mat).mul(ONE_WAD)
                .div(ONE_RAY).div(collateralizationRatio)

        setVaultInfo({
            urn,
            ink,
            dart,
            price,
            spot,
            mat,
            collateralizationRatio,
            liquidationPrice
        })

    }, [vault, manager, vat, spotter])

    return (
        <div>
            <ul>
                <li>#{vault?.cdp.toString()}</li>
                <li>Ilk: {vault?.ilk}</li>
                <li>Urn: {vaultInfo?.urn}</li>
                <li>Ink: {/*TODO Check if it is correct the number of decimals*/formatEther(vaultInfo.ink)}</li>
                <li>Dart: {vaultInfo?.dart ? formatEther(vaultInfo.dart) : 0}</li>
                <li>Urn: {vaultInfo?.urn}</li>
                <li>Price: {/*TODO Check if it is correct the number of decimals*/formatUnits(vaultInfo.price, 27)}</li>
                <li>Liquidation Price: {/*TODO Check if it is correct the number of decimals*/formatEther(vaultInfo.liquidationPrice)}</li>
                <li>Collateralization Ratio: {/*TODO Check if it is correct the number of decimals*/formatEther(vaultInfo.collateralizationRatio)}</li>
                <li>Liquidation Ratio: {/*TODO Check if it is correct the number of decimals*/formatUnits(vaultInfo.mat, 27)}</li>
            </ul>
            <Provider value={{ vaultInfo }}>
                {children}
            </Provider>

        </div>

    )
}
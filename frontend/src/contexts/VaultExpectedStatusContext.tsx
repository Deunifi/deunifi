import { BigNumber } from '@ethersproject/bignumber';
import { ethers } from 'ethers';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { useVaultContext } from '../contexts/VaultSelectionContext';
import { useEffectAutoCancel } from '../hooks/useEffectAutoCancel';
import { useVaultExpectedOperationContext } from './VaultExpectedOperationContext';
import { getCollateralizationRatio, getLiquidationPrice, useVaultInfoContext } from './VaultInfoContext';

interface Props { }

export interface IVaultExpectedStatus {
    ink: BigNumber, // Collateral in WAD
    dart: BigNumber, // Dai debt in WAD
    collateralizationRatio: BigNumber, // in WAD
    liquidationPrice: BigNumber, // in WAD    

    minCollateralToLock?: BigNumber,
    minCollateralizationRatio?: BigNumber,
    maxLiquidationPrice?: BigNumber,

}

export const emptyVaultExpectedStatus: IVaultExpectedStatus = {
    ink: ethers.constants.Zero, // Collateral in WAD
    dart: ethers.constants.Zero, // Dai debt in WAD
    collateralizationRatio: ethers.constants.Zero, // in WAD
    liquidationPrice: ethers.constants.Zero, // in WAD    
}


const VaultExpectedStatusContext = createContext<{ vaultExpectedStatus: IVaultExpectedStatus }>({ vaultExpectedStatus: emptyVaultExpectedStatus })
const { Provider } = VaultExpectedStatusContext
export const useVaultExpectedStatusContext = () => useContext(VaultExpectedStatusContext)

export const VaultExpectedStatusProvider: React.FC<Props> = ({ children }) => {

    const [ vaultExpectedStatus, setVaultExpectedStatus ] = useState<IVaultExpectedStatus>(emptyVaultExpectedStatus)

    const { vaultInfo } = useVaultInfoContext()
    const { vaultExpectedOperation } = useVaultExpectedOperationContext()
    const { vault } = useVaultContext()

    useEffect( () => {

        const vaultExpectedStatus = {...emptyVaultExpectedStatus}

        if (vault) {
    
            vaultExpectedStatus.ink = vaultInfo.ink.add(vaultExpectedOperation.collateralToLock)
            vaultExpectedStatus.dart = vaultInfo.dart.add(vaultExpectedOperation.daiToDraw)
    
            vaultExpectedStatus.collateralizationRatio =
                getCollateralizationRatio(
                    vaultInfo.ink.add(vaultExpectedOperation.collateralToLock),
                    vaultInfo.dart.add(vaultExpectedOperation.daiToDraw),
                    vaultInfo.price
                )
    
            vaultExpectedStatus.liquidationPrice =
                getLiquidationPrice(
                    vaultInfo.ink.add(vaultExpectedOperation.collateralToLock),
                    vaultInfo.dart.add(vaultExpectedOperation.daiToDraw),
                    vaultInfo.mat
                )
    
            if (vaultExpectedOperation.minCollateralToLock){
    
                vaultExpectedStatus.minCollateralizationRatio =
                    getCollateralizationRatio(
                        vaultInfo.ink.add(vaultExpectedOperation.minCollateralToLock),
                        vaultInfo.dart.add(vaultExpectedOperation.daiToDraw),
                        vaultInfo.price
                    )
    
                vaultExpectedStatus.maxLiquidationPrice =
                    getLiquidationPrice(
                        vaultInfo.ink.add(vaultExpectedOperation.minCollateralToLock),
                        vaultInfo.dart.add(vaultExpectedOperation.daiToDraw),
                        vaultInfo.mat
                    )
    
            }
    
        }
    
        setVaultExpectedStatus(vaultExpectedStatus)

    }, [vaultInfo, vaultExpectedOperation, vault])

    return (
        <Provider value={{ vaultExpectedStatus: vaultExpectedStatus }}>
            {children}
        </Provider>
    )
}
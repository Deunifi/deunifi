import { BigNumber } from '@ethersproject/bignumber';
import { formatUnits, parseUnits } from '@ethersproject/units';
import { ethers } from 'ethers';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { useVaultContext } from '../contexts/VaultSelectionContext';
import { useEffectAutoCancel } from '../hooks/useEffectAutoCancel';
import { useVaultExpectedOperationContext } from './VaultExpectedOperationContext';
import { calculateDart, getCollateralizationRatio, getLiquidationPrice, useVaultInfoContext } from './VaultInfoContext';

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

export interface IVaultExpectedStatusErrors {
    debtFloor?: string,
    debtCeiling?: string,
    collateralizationRatio?: string,
}

export const emptyVaultExpectedStatus: IVaultExpectedStatus = {
    ink: ethers.constants.Zero, // Collateral in WAD
    dart: ethers.constants.Zero, // Dai debt in WAD
    collateralizationRatio: ethers.constants.Zero, // in WAD
    liquidationPrice: ethers.constants.Zero, // in WAD    
}

export const emptyVaultExpectedStatusErrors: IVaultExpectedStatusErrors = {
}

const VaultExpectedStatusContext = createContext<{ 
    vaultExpectedStatus: IVaultExpectedStatus, 
    vaultExpectedStatusErrors: IVaultExpectedStatusErrors 
}>({ vaultExpectedStatus: emptyVaultExpectedStatus, vaultExpectedStatusErrors: emptyVaultExpectedStatusErrors })

const { Provider } = VaultExpectedStatusContext
export const useVaultExpectedStatusContext = () => useContext(VaultExpectedStatusContext)

export const VaultExpectedStatusProvider: React.FC<Props> = ({ children }) => {

    const [ vaultExpectedStatus, setVaultExpectedStatus ] = useState<IVaultExpectedStatus>(emptyVaultExpectedStatus)
    const [ vaultExpectedStatusErrors, setVaultExpectedStatusErrors ] = useState<IVaultExpectedStatusErrors>(emptyVaultExpectedStatusErrors)

    const { vaultInfo } = useVaultInfoContext()
    const { vaultExpectedOperation } = useVaultExpectedOperationContext()
    const { vault } = useVaultContext()

    useEffect( () => {

        const vaultExpectedStatus = {...emptyVaultExpectedStatus}
        const vaultExpectedStatusErrors = {...emptyVaultExpectedStatusErrors}

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
    
            // Verifying Debt Floor 
            if (vaultExpectedStatus.dart.gt(ethers.constants.Zero) && 
                vaultExpectedStatus.dart
                .mul(parseUnits('1',27))
                .lt(vaultInfo.dust))
                vaultExpectedStatusErrors.debtFloor = `The vault's debt must be higher than ${formatUnits(vaultInfo.dust, 45)}.`
    
            // Verifying Collateralization ratio

            const collateralizationRatioError = `Collateralization ratio must be higher than ${formatUnits(vaultInfo.mat, 27)}.`
            if (vaultExpectedStatus.collateralizationRatio.gt(ethers.constants.Zero)){

                if (vaultExpectedStatus.collateralizationRatio
                    .mul(parseUnits('1',9))
                    .lt(vaultInfo.mat))
                    vaultExpectedStatusErrors.collateralizationRatio = collateralizationRatioError
    
            }else if (vaultExpectedStatus.dart.gt(ethers.constants.Zero)){

                vaultExpectedStatusErrors.collateralizationRatio = collateralizationRatioError

            }
    

            // Verifying Debt Ceiling 
            if (vaultExpectedOperation.daiToDraw.gt(ethers.constants.Zero)){

                let maxDaiToDraw = vaultInfo.line.sub(calculateDart(vaultInfo.Art, vaultInfo.rate).mul(parseUnits('1',27)))
                maxDaiToDraw = maxDaiToDraw.isNegative() ? ethers.constants.Zero : maxDaiToDraw

                if (vaultExpectedOperation.daiToDraw
                    .mul(parseUnits('1',27))
                    .gt(maxDaiToDraw)){
                    vaultExpectedStatusErrors.debtCeiling = `The debt's vault to generate must be lower than ${formatUnits(maxDaiToDraw, 45)}.`
                }

            }

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

                // Verifying Collateralization ratio
                if (vaultExpectedStatus.minCollateralizationRatio.gt(ethers.constants.Zero) && 
                    vaultExpectedStatus.minCollateralizationRatio
                    .mul(parseUnits('1',9))
                    .lt(vaultInfo.mat))
                    vaultExpectedStatusErrors.collateralizationRatio = `Min. collateralization ratio must be higher than ${formatUnits(vaultInfo.mat, 27)}.`
    
            }

    
        }
    
        setVaultExpectedStatus(vaultExpectedStatus)
        setVaultExpectedStatusErrors(vaultExpectedStatusErrors)

    }, [vaultInfo, vaultExpectedOperation, vault])

    return (
        <Provider value={{ vaultExpectedStatus, vaultExpectedStatusErrors }}>
            {children}
        </Provider>
    )
}
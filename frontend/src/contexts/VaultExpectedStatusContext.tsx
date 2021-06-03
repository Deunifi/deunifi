import { BigNumber } from '@ethersproject/bignumber';
import { ethers } from 'ethers';
import React, { createContext, useContext, useState } from 'react';
import { useVaultContext } from '../contexts/VaultSelectionContext';
import { useEffectAutoCancel } from '../hooks/useEffectAutoCancel';
import { useVaultExpectedOperationContext } from './VaultExpectedOperationContext';
import { useVaultInfoContext } from './VaultInfoContext';

interface Props { }

export interface IVaultExpectedStatus {
    ink: BigNumber, // Collateral in WAD
    dart: BigNumber, // Dai debt in WAD
    collateralizationRatio: BigNumber, // in WAD
    liquidationPrice: BigNumber, // in WAD    
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


    useEffectAutoCancel(function* () {

        if (!vault) {
            setVaultExpectedStatus(emptyVaultExpectedStatus)
            return
        }

        setVaultExpectedStatus({
            // TODO Add tollerance.
            ink: vaultInfo.ink.add(vaultExpectedOperation.collateralToLock),
            dart: vaultInfo.dart.add(vaultExpectedOperation.daiToDraw),
            collateralizationRatio: vaultExpectedOperation.collateralizationRatio,
            liquidationPrice: vaultExpectedOperation.liquidationPrice,
        })

    }, [vault, vaultExpectedOperation, vaultInfo])

    return (
        <Provider value={{ vaultExpectedStatus: vaultExpectedStatus }}>
            {children}
        </Provider>
    )
}
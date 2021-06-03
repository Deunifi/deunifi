import { BigNumber, ethers } from "ethers";
import { createContext, Dispatch, useContext, useState } from "react";

interface IVaultExpectedOperation {

    daiToDraw: BigNumber,

    collateralToLock: BigNumber,
    minCollateralToLock: BigNumber,

    collateralizationRatio: BigNumber,
    minCollateralizationRatio: BigNumber,

    liquidationPrice: BigNumber,
    maxLiquidationPrice: BigNumber,

}

export const initialVaultExpectedOperation: IVaultExpectedOperation = {
    daiToDraw: ethers.constants.Zero,
    collateralToLock: ethers.constants.Zero,
    minCollateralToLock: ethers.constants.Zero,
    collateralizationRatio: ethers.constants.Zero,
    minCollateralizationRatio: ethers.constants.Zero,
    liquidationPrice: ethers.constants.Zero,
    maxLiquidationPrice: ethers.constants.Zero,
}

interface Props { }

export const VaultExpectedOperationContext = createContext<{ vaultExpectedOperation: IVaultExpectedOperation, 
        setVaultExpectedOperation: Dispatch<IVaultExpectedOperation> }>({ 
            vaultExpectedOperation: initialVaultExpectedOperation,
            setVaultExpectedOperation: () => { console.error('Call to default function') }
        })

const { Provider } = VaultExpectedOperationContext

export const useVaultExpectedOperationContext = () => useContext(VaultExpectedOperationContext)

export const VaultExpectedOperationProvider: React.FC<Props> = ({ children }) => {

    const [vaultExpectedOperation, setVaultExpectedOperation] = useState<IVaultExpectedOperation>(initialVaultExpectedOperation)

    return (
        <Provider value={ { vaultExpectedOperation, setVaultExpectedOperation } }>
            {children}
        </Provider>
    )
}
import { BigNumber, ethers } from "ethers";
import { type } from "node:os";
import { createContext, Dispatch, useContext, useState } from "react";


interface IVaultExpectedOperation {

    daiToDraw: BigNumber,
    collateralToLock: BigNumber,
    minCollateralToLock?: BigNumber,

}

export const initialVaultExpectedOperation: IVaultExpectedOperation = {
    daiToDraw: ethers.constants.Zero,
    collateralToLock: ethers.constants.Zero,
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
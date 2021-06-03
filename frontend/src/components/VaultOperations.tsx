import React from 'react';
import { useVaultInfoContext } from '../contexts/VaultInfoContext';
import { LockAndDraw } from './LockAndDraw';
import { WipeAndFree } from './WipeAndFree';

interface Props { }

export const VaultOperations: React.FC<Props> = ({ children }) => {

    const { vaultInfo } = useVaultInfoContext()

    return (
        <div>
            {vaultInfo.ilkInfo.ilk?
                <div>
                    <WipeAndFree />
                    <LockAndDraw />
                </div>
                : ''
            }
        </div>

    )
}
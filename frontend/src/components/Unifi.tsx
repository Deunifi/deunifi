import React from 'react';
import { VaultInfo } from './VaultInfo';
// import { OneInchTest } from './OneInchTest';
// import { PsmTest } from './PsmTest';
import { VaultSelectionProvider } from '../contexts/VaultSelectionContext'
import { useDsProxyContext } from '../contexts/DsProxyContext';
import { VaultInfoProvider } from '../contexts/VaultInfoContext';
import { VaultOperations } from './VaultOperations';


interface Props { }

export const Unifi: React.FC<Props> = () => {

    const { dsProxy } = useDsProxyContext()

    return (

        <div>
            {/* <PsmTest>
            </PsmTest>
            <OneInchTest>
            </OneInchTest> */}
            {
                dsProxy?
                    <div>
                        <VaultSelectionProvider>
                            <VaultInfoProvider>
                                <VaultInfo></VaultInfo>
                                <VaultOperations></VaultOperations>
                            </VaultInfoProvider>
                        </VaultSelectionProvider>
                    </div>
                    : undefined
            }
        </div>
    )
}
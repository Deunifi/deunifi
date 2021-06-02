import React from 'react';
import { VaultInfo } from './VaultInfo';
import { WipeAndFree } from './WipeAndFree';
import { LockAndDraw } from './LockAndDraw';
import { OpenVault } from './OpenVault';
// import { OneInchTest } from './OneInchTest';
// import { PsmTest } from './PsmTest';
import { VaultSelectionProvider } from '../contexts/VaultSelectionContext'
import { useDsProxyContext } from '../contexts/DsProxyContext';


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
                            <VaultInfo>
                                <WipeAndFree>
                                </WipeAndFree>
                                <LockAndDraw>
                                </LockAndDraw>
                            </VaultInfo>
                            <OpenVault>
                            </OpenVault>
                        </VaultSelectionProvider>
                    </div>
                    : undefined
            }
        </div>
    )
}
import React, { useEffect, useState } from 'react';
import { useDSProxyContainer, VaultSelection } from './VaultSelection';
import { VaultInfo } from './VaultInfo';
import { WipeAndFree } from './WipeAndFree';
import { LockAndDraw } from './LockAndDraw';
import { OpenVault } from './OpenVault';
import { OneInchTest } from './OneInchTest';
import { PsmTest } from './PsmTest';


interface Props { }

export const Unifi: React.FC<Props> = () => {

    const { dsProxy } = useDSProxyContainer()

    return (

        <div>
            {/* <PsmTest>
            </PsmTest>
            <OneInchTest>
            </OneInchTest> */}
            {
                dsProxy?
                    <div>
                        <VaultSelection>
                            <VaultInfo>
                                <WipeAndFree>
                                </WipeAndFree>
                                <LockAndDraw>
                                </LockAndDraw>
                            </VaultInfo>
                        </VaultSelection>
                        <OpenVault>
                        </OpenVault>
                    </div>
                    : undefined
            }
        </div>
    )
}
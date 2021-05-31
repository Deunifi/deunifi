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
                        <OpenVault>
                        </OpenVault>
                        <VaultSelection>
                            <VaultInfo>
                                <WipeAndFree>
                                </WipeAndFree>
                                <LockAndDraw>
                                </LockAndDraw>
                            </VaultInfo>
                        </VaultSelection>
                    </div>
                    : undefined
            }
        </div>
    )
}
import React, { useEffect, useState } from 'react';
import { VaultSelection } from './VaultSelection';
import { VaultInfo } from './VaultInfo';
import { WipeAndFree } from './WipeAndFree';
import { LockAndDraw } from './LockAndDraw';
import { OpenVault } from './OpenVault';
import { OneInchTest } from './OneInchTest';
import { PsmTest } from './PsmTest';
import { Block } from '../contexts/BlockContext';

interface Props { }

export const Unifi: React.FC<Props> = () => {
    return (
        <div>
            {/* <PsmTest>
            </PsmTest>
            <OneInchTest>
            </OneInchTest> */}
            <Block>
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
            </Block>
        </div>
    )
}
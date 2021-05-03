import React, { useEffect, useState } from 'react';
import { VaultSelection } from './VaultSelection';
import { VaultInfo } from './VaultInfo';
import { WipeAndFree } from './WipeAndFree';
import { LockAndDraw } from './LockAndDraw';
import { OpenVault } from './OpenVault';

interface Props { }

export const Unifi: React.FC<Props> = () => {
    return (
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
    )
}
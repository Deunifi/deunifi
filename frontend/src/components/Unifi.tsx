import React, { useEffect, useState } from 'react';
import { VaultSelection } from './VaultSelection';
import { VaultInfo } from './VaultInfo';
import { WipeAndFree } from './WipeAndFree';
import { LockAndDraw } from './LockAndDraw';

interface Props { }

export const Unifi: React.FC<Props> = () => {
    return (
        <div>
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
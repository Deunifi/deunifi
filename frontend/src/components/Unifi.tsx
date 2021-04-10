import React, { useEffect, useState } from 'react';
import { VaultSelection } from './VaultSelection';
import { VaultInfo } from './VaultInfo';

interface Props { }

export const Unifi: React.FC<Props> = () => {
    return (
        <div>
            <VaultSelection>
                <VaultInfo></VaultInfo>
            </VaultSelection>
        </div>
    )
}
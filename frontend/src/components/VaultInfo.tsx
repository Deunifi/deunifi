import React, { useEffect, useState } from 'react';
import { useVaultContext, VaultSelection } from './VaultSelection';

interface Props { }

export const VaultInfo: React.FC<Props> = () => {

    const {vault} = useVaultContext()

    return (
        <div>
            {vault?.cdp.toString()}
        </div>
    )
}
import React, { useEffect, useState } from 'react';
import { VaultSelection } from './VaultSelection';

interface Props { }

export const Unifi: React.FC<Props> = () => {
    return (
        <div>
            <VaultSelection></VaultSelection>
        </div>
    )
}
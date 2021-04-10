import { BigNumber } from '@ethersproject/bignumber';
import React, { useEffect, useRef, useState } from 'react';
import { useEffectAsync } from '../hooks/useEffectAsync';
import { useContract } from './Deployments';
import { useVaultContext, VaultSelection } from './VaultSelection';

interface Props { }

export const VaultInfo: React.FC<Props> = () => {

    const {vault} = useVaultContext()
    const manager = useContract('DssCdpManager')
    const [urn, setUrn] = useState()

    useEffectAsync(async () => {
            
        if (!vault || !manager){
            setUrn(undefined)
            return
        }

        const _urn = await manager.urns(BigNumber.from(vault.cdp));

        setUrn(_urn)

    }, [vault, manager])

    return (
        <ul>
            <li>#{vault?.cdp.toString()}</li>
            <li>Ilk: {vault?.ilk}</li>
            <li>Urn: {urn}</li>
        </ul>
    )
}
import { BigNumber } from '@ethersproject/bignumber';
import { formatBytes32String } from '@ethersproject/strings';
import { formatEther, parseUnits } from '@ethersproject/units';
import React, { useEffect, useRef, useState } from 'react';
import { useEffectAsync } from '../hooks/useEffectAsync';
import { useContract } from './Deployments';
import { useVaultContext, VaultSelection } from './VaultSelection';

interface Props { }

const ONE_RAY = parseUnits('1',27)

export const VaultInfo: React.FC<Props> = () => {

    const {vault} = useVaultContext()

    const manager = useContract('DssCdpManager')
    const vat = useContract('Vat')

    const [urn, setUrn] = useState()
    const [ink, setInk] = useState(BigNumber.from(0))
    const [dart, setDart] = useState(BigNumber.from(0))

    useEffectAsync(async () => {
            
        if (!vault || !manager || !vat){
            setUrn(undefined)
            setInk(BigNumber.from(0))
            setDart(BigNumber.from(0))
            return
        }

        const urn = await manager.urns(vault.cdp);
        setUrn(urn)

        const { rate } = await vat.ilks(formatBytes32String(vault.ilk))

        const { ink, art }: { ink: BigNumber, art: BigNumber } = await vat.urns(formatBytes32String(vault.ilk), urn)

        const dart = art.isZero() ? art : art.mul(rate).div(ONE_RAY).add(1)

        setInk(ink)
        setDart(dart)

    }, [vault, manager])

    return (
        <ul>
            <li>#{vault?.cdp.toString()}</li>
            <li>Ilk: {vault?.ilk}</li>
            <li>Urn: {urn}</li>
            <li>Ink: {formatEther(ink)}</li>
            <li>Dart: {formatEther(dart)}</li>
        </ul>
    )
}
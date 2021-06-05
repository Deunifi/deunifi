import { BigNumber } from '@ethersproject/bignumber';
import { formatEther, formatUnits, parseEther, parseUnits } from '@ethersproject/units';
import { Card, CardActions, CardContent, Slider, Typography } from '@material-ui/core';
import React, { useEffect, useState } from 'react';
import { useApyContext } from '../contexts/APYContext';
import { useVaultExpectedStatusContext } from '../contexts/VaultExpectedStatusContext';
import { useVaultInfoContext } from '../contexts/VaultInfoContext';
import { OpenVaultButton } from './OpenVaultButton';
import { VaultSelection } from './VaultSelection';

interface Props { }

interface IVaultExpectedValueProps {
    operationInProgress: boolean, 
    value: BigNumber,
    error?: boolean,
    decimals?: number
}
const VaultExpectedValue: React.FC<IVaultExpectedValueProps> = ({operationInProgress, value, error=false, decimals=18}) => {
    return (
        <span>{
            operationInProgress? 
                <Typography variant="body2" color={error? 'secondary' : 'primary'}>({formatUnits(value, decimals)})</Typography> 
                : ''
        }</span>
    )
}

export const VaultInfo: React.FC<Props> = ({ children }) => {

    const { vaultInfo } = useVaultInfoContext()
    const { vaultExpectedStatus } = useVaultExpectedStatusContext()
    const { apy } = useApyContext()

    const [operationInProgress, setOperationInProgress] = useState<boolean>(false)

    useEffect(() => {

        setOperationInProgress(
            !vaultInfo.ink.eq(vaultExpectedStatus.ink) ||
            !vaultInfo.dart.eq(vaultExpectedStatus.dart)
        )

    }, [vaultInfo])

    return (
        <div>
            <Card>
                { (!vaultInfo.cdp.isZero()) ? 
                    <CardContent>
                        {/* <Typography color="textSecondary" gutterBottom>
                        Vault Status Information
                        </Typography> */}
                        <VaultSelection>
                        </VaultSelection>

                        <Typography id="discrete-slider" gutterBottom>
                            APY Days to consider
                        </Typography>
                        <Slider
                            defaultValue={30}
                            // getAriaValueText={valuetext}
                            aria-labelledby="discrete-slider"
                            valueLabelDisplay="auto"
                            step={1}
                            marks
                            min={1}
                            max={30}
                            onChangeCommitted={ (e, newValue) => {
                                 apy.setCalculationDays(newValue as number) 
                            }}
                        />

                        <Typography variant="body2" component="p" color="textSecondary">
                            {vaultInfo.ilkInfo.ilk} APY: {apy.ilkApy} 
                        </Typography>

                        <Typography variant="body2" component="p" color="textSecondary">
                            Effective APY: {apy.vaultApy} <VaultExpectedValue operationInProgress value={parseEther(apy.vaultExpectedApy.toString())} />
                        </Typography>

                        {/* <Typography variant="h5" component="h2">
                        #{vault?.cdp.toString()} - {vault?.ilk}
                        </Typography> */}
                        <Typography variant="body2" component="p" color="textSecondary">
                        Collateral Locked: {formatEther(vaultInfo.ink)} 
                            <VaultExpectedValue operationInProgress value={vaultExpectedStatus.ink} />
                        </Typography>
                        <Typography variant="body2" component="p" color="textSecondary">
                        Debt: {vaultInfo?.dart ? formatEther(vaultInfo.dart) : 0}
                            <VaultExpectedValue operationInProgress value={vaultExpectedStatus.dart} />
                        </Typography>
                        <Typography variant="body2" component="p" color="textSecondary">
                        Price: {formatUnits(vaultInfo.price, 27)}
                        </Typography>
                        <Typography variant="body2" component="p" color="textSecondary">
                        Liquidation Price: {formatUnits(vaultInfo.liquidationPrice, 27)}
                            <VaultExpectedValue 
                                operationInProgress 
                                value={vaultExpectedStatus.liquidationPrice} 
                                decimals={27}
                                />
                        </Typography>
                        <Typography variant="body2" component="p" color="textSecondary">
                        Collateralization Ratio: {formatEther(vaultInfo.collateralizationRatio)}
                            <VaultExpectedValue 
                                operationInProgress 
                                value={vaultExpectedStatus.collateralizationRatio} 
                                error={vaultInfo.mat.gt(vaultExpectedStatus.collateralizationRatio.mul(parseUnits('1', 9)))}
                                />
                        </Typography>
                        <Typography variant="body2" component="p" color="textSecondary">
                        Liquidation Ratio: {formatUnits(vaultInfo.mat, 27)}
                        </Typography>

                    </CardContent>
                    :''}
                <CardActions>
                    <OpenVaultButton></OpenVaultButton>
                </CardActions>
            </Card>

        </div>

    )
}
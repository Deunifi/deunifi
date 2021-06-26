import { BigNumber } from '@ethersproject/bignumber';
import { formatEther, formatUnits, parseEther, parseUnits } from '@ethersproject/units';
import { Box, Card, CardContent, Dialog, DialogContent, DialogTitle, Grid, IconButton, Link, Slider, Typography } from '@material-ui/core';
import React, { useEffect, useState } from 'react';
import { useApyContext, MAX_APY_DAYS, DEFAULT_APY_DAYS } from '../contexts/APYContext';
import { useVaultExpectedStatusContext } from '../contexts/VaultExpectedStatusContext';
import { useVaultInfoContext } from '../contexts/VaultInfoContext';
import { Settings } from '@material-ui/icons';
import { apyToPercentage } from './LockAndDraw';

interface Props { }

interface IVaultExpectedValueProps {
    operationInProgress: boolean,
    actualValue: BigNumber,
    value: BigNumber,
    error?: boolean,
    decimals?: number,
    units?: string
}
const VaultExpectedValue: React.FC<IVaultExpectedValueProps> = ({ operationInProgress, actualValue, value, error = false, decimals = 18, units }) => {
    return (
        <span>{
            operationInProgress && !actualValue.eq(value) ?
                <Typography variant="body2" color={error ? 'error' : 'primary'}>
                    {formatBigNumber(value, decimals)} <Typography variant="body2" component="span" color="textSecondary" hidden={units? false: true} style={{display: 'inline-block'}}>
                        {units} 
                    </Typography>
                </Typography>
                : ''
        }</span>
    )
}

export const VaultActualValue: React.FC<{ label: string, units?: string, value: string|number }> = ({ label, value, units }) => {
    return (
        <span>
            <Typography variant="caption" component="span" color="textSecondary">
                {label}:
            </Typography>
            <Box>
                <Typography variant="body1" component="span" color="textPrimary" style={{display: 'inline-block'}}>
                    {value} <Typography variant="body2" component="span" color="textSecondary" hidden={units? false: true} style={{display: 'inline-block'}}>
                        {units} 
                    </Typography>
                </Typography>
            </Box>
        </span>
    )
}

const VaultParameter: React.FC<{ label: string, value: string|number, units?:string }> = ({ label, value, units }) => {
    return (
        <span>
            <Typography variant="caption" component="span" color="textSecondary">
                ({label}: <Typography variant="caption" component="span" color="textSecondary">
                    {value} {units}
                </Typography>)
            </Typography>
        </span>
    )
}

export const VaultValueEstimation: React.FC<{ value: string|number, units?:string }> = ({ value, units }) => {
    return (
        <span>
                <Typography variant="caption" component="span" color="textSecondary">
                    (~ {value} {units})
                </Typography>
        </span>
    )
}

export const VaultExpectedValueEstimation: React.FC<{ actualValue: string|number, expectedValue: string|number, units?:string }> = ({ actualValue, expectedValue, units }) => {
    return (
        <span hidden={actualValue == expectedValue}>
                <Typography variant="caption" component="span" color="textSecondary">
                    (~ <Typography variant="caption" component="span" color="primary" style={{display: 'inline-block'}}>{expectedValue}</Typography> {units})
                </Typography>
        </span>
    )
}



export const APYConfig: React.FC = () => {
    const { apy } = useApyContext()
    return (
        <span>
            <Typography id="discrete-slider" gutterBottom variant="body2" component="span" color="textSecondary">
                Past days to consider in APY's calculation
            </Typography>
            <Slider
                defaultValue={apy.calculationDaysQuantity || DEFAULT_APY_DAYS}
                getAriaValueText={(value) => `${value} days`}
                aria-labelledby="discrete-slider"
                valueLabelDisplay="auto"
                step={1}
                // marks
                min={1}
                max={MAX_APY_DAYS}
                onChangeCommitted={(e, newValue) => {
                    apy.setCalculationDays(newValue as number)
                }}
            />
        </span>
    )
}

export interface SimpleDialogProps {
    open: boolean;
    onClose: () => void;
}

function APYConFigDialog(props: SimpleDialogProps) {
    const { onClose, open } = props;

    const handleClose = () => {
        onClose();
    };

    return (
        <Dialog onClose={handleClose} aria-labelledby="simple-dialog-title" open={open}>
            <DialogTitle id="simple-dialog-title">APY: Days to consider</DialogTitle>
            <DialogContent>
                <APYConfig></APYConfig>
            </DialogContent>
        </Dialog>
    );
}

export default function APYConFigButton() {
    const [open, setOpen] = React.useState(false);

    const handleClickOpen = () => {
        setOpen(true);
    };

    const handleClose = () => {
        setOpen(false);
    };

    return (
        <span>
            <IconButton aria-label="config-apy" size="small" onClick={handleClickOpen}>
                <Settings />
            </IconButton>
            <APYConFigDialog open={open} onClose={handleClose} />
        </span>
    );
}

export const formatBigNumber = (x: BigNumber, decimals: number = 18): string => {
    const rest = decimals > 18 ? decimals - 18 : 0
    return formatUnits(x.div(parseUnits('1',rest)), decimals-rest)
}

export const VaultInfo: React.FC<Props> = ({ children }) => {

    const { vaultInfo } = useVaultInfoContext()
    const { vaultExpectedStatus, vaultExpectedStatusErrors } = useVaultExpectedStatusContext()
    const { apy } = useApyContext()

    const [operationInProgress, setOperationInProgress] = useState<boolean>(false)

    useEffect(() => {

        setOperationInProgress(
            !vaultInfo.ink.eq(vaultExpectedStatus.ink) ||
            !vaultInfo.dart.eq(vaultExpectedStatus.dart)
        )

    }, [vaultInfo])

    return (
        <span>
            <Box hidden={vaultInfo.ilkInfo.ilk? false : true} mt={1}>

                <SimpleCard>

                    <Typography color="textSecondary" gutterBottom>
                        Vault Status
                    </Typography>

                    <Box m={1}>
                        <Grid container>

                            <Grid item md={12} sm={6} xs={12}>
                                <Box mb={2} mt={2}>
                                            <VaultActualValue label='Collateral Locked' value={formatEther(vaultInfo.ink)} units={vaultInfo.ilkInfo.symbol}/>
                                            <VaultValueEstimation value={formatBigNumber(vaultInfo.price.mul(vaultInfo.ink), 45)} units='USD' />
                                            <VaultExpectedValue operationInProgress actualValue={vaultInfo.ink} value={vaultExpectedStatus.ink} units={vaultInfo.ilkInfo.symbol}/>
                                            <VaultExpectedValueEstimation 
                                                actualValue={formatBigNumber(vaultInfo.price.mul(vaultInfo.ink), 45)} 
                                                expectedValue={formatBigNumber(vaultInfo.price.mul(vaultExpectedStatus.ink), 45)} 
                                                units='USD'
                                            ></VaultExpectedValueEstimation>
                                </Box>

                                <Box mb={2}>
                                            <VaultActualValue label='Debt' value={vaultInfo?.dart ? formatEther(vaultInfo.dart) : '0'} units='DAI'/>
                                            <VaultExpectedValue operationInProgress actualValue={vaultInfo.dart} value={vaultExpectedStatus.dart}
                                                error={vaultExpectedStatusErrors.debtCeiling || vaultExpectedStatusErrors.debtFloor ? true : false} 
                                                units='DAI'/>
                                </Box>

                                <Box mb={2}>
                                    <VaultActualValue label='Collateralization Ratio' value={formatEther(vaultInfo.collateralizationRatio.mul(100))} units='%'/>
                                    <VaultExpectedValue
                                        operationInProgress
                                        actualValue={vaultInfo.collateralizationRatio.mul(100)}
                                        value={vaultExpectedStatus.collateralizationRatio.mul(100)}
                                        units='%'
                                        error={vaultExpectedStatusErrors.collateralizationRatio ? true : false}
                                    />
                                    <VaultParameter label='Liquidation Ratio' value={formatBigNumber(vaultInfo.mat.mul(100), 27)} units='%' />
                                </Box>

                            </Grid>

                            <Grid item md={12} sm={6} xs={12}>
                                <Box mb={2} >
                                    <VaultActualValue label='Liquidation Price' value={formatBigNumber(vaultInfo.liquidationPrice, 27)} units='USD'/>
                                    <VaultExpectedValue
                                        operationInProgress
                                        actualValue={vaultInfo.liquidationPrice}
                                        value={vaultExpectedStatus.liquidationPrice}
                                        units='USD'
                                        decimals={27}
                                    />
                                    <VaultParameter label='Current Price' value={formatBigNumber(vaultInfo.price, 27)} units='USD'/>
                                </Box>

                                <Box mb={2}>
                                    <VaultActualValue label="Vault's APY" value={apyToPercentage(apy.vaultApy)} units='%'/>
                                    <VaultExpectedValue operationInProgress actualValue={parseEther(apyToPercentage(apy.vaultApy).toString())} value={parseEther(apyToPercentage(apy.vaultExpectedApy).toString())} 
                                    units='%'/>
                                    <Grid container spacing={1} alignItems="center" direction="row" justify="center">
                                        <Grid item xs={10}>
                                            <span>
                                                <Typography variant="caption" component="span" color="textSecondary">
                                                    ({`Estimation based on information of last ${apy.calculationDaysQuantity} day(s) obtained from Uniswap's Analytics.`} <Link
                                                        href={`https://v2.info.uniswap.org/pair/${vaultInfo.ilkInfo.univ2Pair?.address}`}
                                                        target="_blank"
                                                        >
                                                        {ilkToTokenSymbol(vaultInfo.ilkInfo.ilk)}
                                                        </Link> liquidity pool APY: <Typography variant="caption" component="span" color="textSecondary">
                                                        {apyToPercentage(apy.ilkApy)} %
                                                    </Typography>)
                                                </Typography>
                                            </span>

                                        </Grid>
                                        <Grid item xs={2}>
                                            <Box m={1}>
                                                <APYConFigButton></APYConFigButton>
                                            </Box>
                                        </Grid>
                                    </Grid>                            
                                </Box>
                            </Grid>

                        </Grid>
                    </Box>

                </SimpleCard>
            </Box>
            

        </span>

    )
}

export const SimpleCard: React.FC = ({ children }) => {

    return (
        <Card>
            <CardContent>
                {children}
            </CardContent>
        </Card>
    )

}

export const ilkToTokenSymbol = (ilk: string) => ilk.replace('-A','')
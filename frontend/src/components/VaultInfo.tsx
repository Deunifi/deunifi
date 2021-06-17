import { BigNumber } from '@ethersproject/bignumber';
import { formatEther, formatUnits, parseEther, parseUnits } from '@ethersproject/units';
import { Box, Button, Card, CardActions, CardContent, createStyles, Dialog, DialogContent, DialogTitle, Grid, IconButton, makeStyles, Slider, Theme, Typography } from '@material-ui/core';
import React, { useEffect, useState } from 'react';
import { useApyContext, MAX_APY_DAYS, DEFAULT_APY_DAYS } from '../contexts/APYContext';
import { useVaultExpectedStatusContext } from '../contexts/VaultExpectedStatusContext';
import { useVaultInfoContext } from '../contexts/VaultInfoContext';
import { OpenVaultButton } from './OpenVaultButton';
import { VaultSelection } from './VaultSelection';
import { Settings } from '@material-ui/icons';

interface Props { }

interface IVaultExpectedValueProps {
    operationInProgress: boolean,
    actualValue: BigNumber,
    value: BigNumber,
    error?: boolean,
    decimals?: number
}
const VaultExpectedValue: React.FC<IVaultExpectedValueProps> = ({ operationInProgress, actualValue, value, error = false, decimals = 18 }) => {
    return (
        <span>{
            operationInProgress && !actualValue.eq(value) ?
                <Typography variant="body2" color={error ? 'error' : 'primary'}>{formatBigNumber(value, decimals)}</Typography>
                : ''
        }</span>
    )
}

export const VaultActualValue: React.FC<{ label: string, value: string|number }> = ({ label, value }) => {
    return (
        <span>
            <Typography variant="caption" component="p" color="textSecondary">
                {label}:
            </Typography>
            <Typography variant="body1" component="p" color="textPrimary">
                {value}
            </Typography>
        </span>
    )
}

const VaultParameter: React.FC<{ label: string, value: string|number }> = ({ label, value }) => {
    return (
        <span>
            <Typography variant="caption" component="p" color="secondary">
                ({label}: <Typography variant="caption" component="span" color="secondary">
                    {value}
                </Typography>)
            </Typography>
        </span>
    )
}



export const APYConfig: React.FC = () => {
    const { apy } = useApyContext()
    return (
        <div>
            <Typography id="discrete-slider" gutterBottom variant="body2" component="p" color="textSecondary">
                Past days to consider in APY's calculation
            </Typography>
            <Slider
                defaultValue={apy.calculationDaysQuantity || DEFAULT_APY_DAYS}
                getAriaValueText={(value) => `${value} days`}
                aria-labelledby="discrete-slider"
                valueLabelDisplay="auto"
                step={1}
                marks
                min={1}
                max={MAX_APY_DAYS}
                onChangeCommitted={(e, newValue) => {
                    apy.setCalculationDays(newValue as number)
                }}
            />
        </div>
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
        <div>
            <IconButton aria-label="config-apy" size="small" onClick={handleClickOpen}>
                <Settings />
            </IconButton>
            <APYConFigDialog open={open} onClose={handleClose} />
        </div>
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
        <div>
            <Box hidden={vaultInfo.ilkInfo.ilk? false : true} mt={1}>

                <SimpleCard>

                    <Typography color="textSecondary" gutterBottom>
                        Vault Status
                    </Typography>

                    <Box m={1}>
                        <Box mb={2} mt={2}>
                                    <VaultActualValue label='Collateral Locked' value={formatEther(vaultInfo.ink)} />
                                    <VaultExpectedValue operationInProgress actualValue={vaultInfo.ink} value={vaultExpectedStatus.ink} />
                        </Box>

                        <Box mb={2} mt={2}>
                                    <VaultActualValue label='Debt' value={vaultInfo?.dart ? formatEther(vaultInfo.dart) : '0'} />
                                    <VaultExpectedValue operationInProgress actualValue={vaultInfo.dart} value={vaultExpectedStatus.dart}
                                        error={vaultExpectedStatusErrors.debtCeiling || vaultExpectedStatusErrors.debtFloor ? true : false} />
                        </Box>

                        <Box mb={2} mt={2}>
                            <VaultActualValue label='Collateralization Ratio' value={formatEther(vaultInfo.collateralizationRatio)} />
                            <VaultExpectedValue
                                operationInProgress
                                actualValue={vaultInfo.collateralizationRatio}
                                value={vaultExpectedStatus.collateralizationRatio}
                                error={vaultExpectedStatusErrors.collateralizationRatio ? true : false}
                            />
                            <VaultParameter label='Liquidation Ratio' value={formatBigNumber(vaultInfo.mat, 27)} />
                        </Box>

                        <Box mb={2} mt={2}>
                            <VaultActualValue label='Liquidation Price' value={formatBigNumber(vaultInfo.liquidationPrice, 27)} />
                            <VaultExpectedValue
                                operationInProgress
                                actualValue={vaultInfo.liquidationPrice}
                                value={vaultExpectedStatus.liquidationPrice}
                                decimals={27}
                            />
                            <VaultParameter label='Current Price' value={formatBigNumber(vaultInfo.price, 27)} />
                        </Box>

                        <Box mb={2} mt={2}>
                            <VaultActualValue label="Vault's APY" value={apy.vaultApy} />
                            <VaultExpectedValue operationInProgress actualValue={parseEther(apy.vaultApy.toString())} value={parseEther(apy.vaultExpectedApy.toString())} />
                            <Grid container spacing={1} alignItems="center" direction="row" justify="center">
                                <Grid item xs={10}>
                                    <VaultParameter label={`Estimation based on ${vaultInfo.ilkInfo.ilk}'s APY from last ${apy.calculationDaysQuantity} day(s)`} value={apy.ilkApy} />
                                </Grid>
                                <Grid item xs={2}>
                                    <Box m={1}>
                                        <APYConFigButton></APYConFigButton>
                                    </Box>
                                </Grid>
                            </Grid>                            
                        </Box>
                    </Box>

                </SimpleCard>
            </Box>
            

        </div>

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
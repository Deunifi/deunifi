import { BigNumber } from '@ethersproject/bignumber';
import { formatEther, formatUnits, parseEther, parseUnits } from '@ethersproject/units';
import { Button, Card, CardActions, CardContent, createStyles, Dialog, DialogContent, DialogTitle, Grid, IconButton, makeStyles, Slider, Theme, Typography } from '@material-ui/core';
import React, { useEffect, useState } from 'react';
import { useApyContext } from '../contexts/APYContext';
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
                <Typography variant="body2" color={error ? 'error' : 'primary'}>{formatUnits(value, decimals)}</Typography>
                : ''
        }</span>
    )
}

const VaultActualValue: React.FC<{ label: string, value: string|number }> = ({ label, value }) => {
    return (
        <span>
            <Typography variant="body2" component="p" color="textSecondary">
                {label}:
            </Typography>
            <Typography variant="body2" component="p" color="textPrimary">
                {value}
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
                defaultValue={apy.calculationDaysQuantity || 30}
                getAriaValueText={(value) => `${value} days`}
                aria-labelledby="discrete-slider"
                valueLabelDisplay="auto"
                step={1}
                marks
                min={1}
                max={30}
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

    const handleListItemClick = () => {
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

            <SimpleCard>
                <Grid container spacing={2} alignItems="center" direction="row" justify="space-evenly">

                    <Grid item xs={12}>
                        <SimpleCard>
                            <Grid container spacing={2} alignItems="center" direction="column" justify="space-evenly">
                                <Grid item xs={12}>
                                    <VaultSelection>
                                    </VaultSelection>
                                </Grid>
                                <Grid item xs={12}>
                                    <OpenVaultButton></OpenVaultButton>
                                </Grid>
                            </Grid>
                        </SimpleCard>
                    </Grid>

                    
                        <Grid item xs={6} hidden={vaultInfo.ilkInfo.ilk? false : true}>
                            <SimpleCard>
                                <VaultActualValue label='Collateral Locked' value={formatEther(vaultInfo.ink)} />
                                <VaultExpectedValue operationInProgress actualValue={vaultInfo.ink} value={vaultExpectedStatus.ink} />
                                <br></br>
                                <VaultActualValue label='Debt' value={vaultInfo?.dart ? formatEther(vaultInfo.dart) : '0'} />
                                <VaultExpectedValue operationInProgress actualValue={vaultInfo.dart} value={vaultExpectedStatus.dart}
                                    error={vaultExpectedStatusErrors.debtCeiling || vaultExpectedStatusErrors.debtFloor ? true : false} />
                            </SimpleCard>
                        </Grid>

                        <Grid item xs={6} hidden={vaultInfo.ilkInfo.ilk? false : true}>
                            <Card>
                                <CardContent>
                                    <VaultActualValue label={`${vaultInfo.ilkInfo.ilk} APY`} value={apy.ilkApy} />
                                    <br></br>
                                    <VaultActualValue label="Vault's APY" value={apy.vaultApy} />
                                    <VaultExpectedValue operationInProgress actualValue={parseEther(apy.vaultApy.toString())} value={parseEther(apy.vaultExpectedApy.toString())} />
                                </CardContent>
                                <CardActions>
                                    <APYConFigButton></APYConFigButton>
                                </CardActions>
                            </Card>
                        </Grid>

                        <Grid item xs={6} hidden={vaultInfo.ilkInfo.ilk? false : true}>
                            <SimpleCard>
                                <VaultActualValue label='Collateralization Ratio' value={formatEther(vaultInfo.collateralizationRatio)} />
                                <VaultExpectedValue
                                    operationInProgress
                                    actualValue={vaultInfo.collateralizationRatio}
                                    value={vaultExpectedStatus.collateralizationRatio}
                                    error={vaultExpectedStatusErrors.collateralizationRatio ? true : false}
                                />
                                <br></br>
                                <VaultActualValue label='Liquidation Ratio' value={formatUnits(vaultInfo.mat, 27)} />
                            </SimpleCard>
                        </Grid>

                        <Grid item xs={6} hidden={vaultInfo.ilkInfo.ilk? false : true}>
                            <SimpleCard>
                                <VaultActualValue label='Liquidation Price' value={formatUnits(vaultInfo.liquidationPrice, 27)} />
                                <VaultExpectedValue
                                    operationInProgress
                                    actualValue={vaultInfo.liquidationPrice}
                                    value={vaultExpectedStatus.liquidationPrice}
                                    decimals={27}
                                />
                                <br></br>
                                <VaultActualValue label='Price' value={formatUnits(vaultInfo.price, 27)} />
                            </SimpleCard>
                        </Grid>
                </Grid>
            </SimpleCard>

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
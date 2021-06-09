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
    value: BigNumber,
    error?: boolean,
    decimals?: number
}
const VaultExpectedValue: React.FC<IVaultExpectedValueProps> = ({ operationInProgress, value, error = false, decimals = 18 }) => {
    return (
        <span>{
            operationInProgress ?
                <Typography variant="body2" color={error ? 'secondary' : 'primary'}>({formatUnits(value, decimals)})</Typography>
                : ''
        }</span>
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
                defaultValue={30}
                // getAriaValueText={valuetext}
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
                            <VaultSelection>
                            </VaultSelection>
                            <OpenVaultButton></OpenVaultButton>
                        </SimpleCard>
                    </Grid>

                    <Grid item xs={6}>
                        <SimpleCard>
                            <Typography variant="body2" component="p" color="textSecondary">
                                Collateral Locked: {formatEther(vaultInfo.ink)}
                                <VaultExpectedValue operationInProgress value={vaultExpectedStatus.ink} />
                            </Typography>
                            <br></br>
                            <Typography variant="body2" component="p" color="textSecondary">
                                Debt: {vaultInfo?.dart ? formatEther(vaultInfo.dart) : 0}
                                <VaultExpectedValue operationInProgress value={vaultExpectedStatus.dart} />
                            </Typography>
                        </SimpleCard>
                    </Grid>

                    <Grid item xs={6}>
                        <Card>
                            <CardContent>
                                <Typography variant="body2" component="p" color="textSecondary">
                                    {vaultInfo.ilkInfo.ilk} APY: {apy.ilkApy}
                                </Typography>
                                <br></br>
                                <Typography variant="body2" component="p" color="textSecondary">
                                    Vault's APY: {apy.vaultApy} <VaultExpectedValue operationInProgress value={parseEther(apy.vaultExpectedApy.toString())} />
                                </Typography>
                            </CardContent>
                            <CardActions>
                                <APYConFigButton></APYConFigButton>
                            </CardActions>
                        </Card>
                    </Grid>

                    <Grid item xs={6}>
                        <SimpleCard>
                            <Typography variant="body2" component="p" color="textSecondary">
                                Liquidation Ratio: {formatUnits(vaultInfo.mat, 27)}
                            </Typography>
                            <br></br>
                            <Typography variant="body2" component="p" color="textSecondary">
                                Collateralization Ratio: {formatEther(vaultInfo.collateralizationRatio)}
                                <VaultExpectedValue
                                    operationInProgress
                                    value={vaultExpectedStatus.collateralizationRatio}
                                    error={vaultExpectedStatusErrors.collateralizationRatio ? true : false}
                                />
                            </Typography>
                        </SimpleCard>
                    </Grid>

                    <Grid item xs={6}>
                        <SimpleCard>
                            <Typography variant="body2" component="p" color="textSecondary">
                                Price: {formatUnits(vaultInfo.price, 27)}
                            </Typography>
                            <br></br>
                            <Typography variant="body2" component="p" color="textSecondary">
                                Liquidation Price: {formatUnits(vaultInfo.liquidationPrice, 27)}
                                <VaultExpectedValue
                                    operationInProgress
                                    value={vaultExpectedStatus.liquidationPrice}
                                    decimals={27}
                                />
                            </Typography>
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
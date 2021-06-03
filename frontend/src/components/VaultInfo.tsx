import { formatEther, formatUnits } from '@ethersproject/units';
import { Card, CardActions, CardContent, Typography } from '@material-ui/core';
import React from 'react';
import { useVaultInfoContext } from '../contexts/VaultInfoContext';
import { OpenVaultButton } from './OpenVaultButton';
import { VaultSelection } from './VaultSelection';

interface Props { }

export const VaultInfo: React.FC<Props> = ({ children }) => {

    const { vaultInfo } = useVaultInfoContext()

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

                        {/* <Typography variant="h5" component="h2">
                        #{vault?.cdp.toString()} - {vault?.ilk}
                        </Typography> */}
                        <Typography variant="body2" component="p" color="textSecondary">
                        Collateral Locked: {formatEther(vaultInfo.ink)}
                        </Typography>
                        <Typography variant="body2" component="p" color="textSecondary">
                        Debt: {vaultInfo?.dart ? formatEther(vaultInfo.dart) : 0}
                        </Typography>
                        <Typography variant="body2" component="p" color="textSecondary">
                        Price: {formatUnits(vaultInfo.price, 27)}
                        </Typography>
                        <Typography variant="body2" component="p" color="textSecondary">
                        Liquidation Price: {formatUnits(vaultInfo.liquidationPrice, 27)}
                        </Typography>
                        <Typography variant="body2" component="p" color="textSecondary">
                        Collateralization Ratio: {formatEther(vaultInfo.collateralizationRatio)}
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
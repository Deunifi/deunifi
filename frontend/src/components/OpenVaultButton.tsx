import { formatBytes32String, parseBytes32String } from "@ethersproject/strings";
import { useState } from "react";
import { useSigner } from "./Connection";
import { useContract } from "./Deployments";
import { proxyExecute } from "./WipeAndFree";
import { useEffectAutoCancel } from "../hooks/useEffectAutoCancel";
import { Button, Card, CardActions, CardContent, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, FormControl, FormHelperText, InputLabel, MenuItem, Select, TextField, Typography } from "@material-ui/core";
import { useDsProxyContext } from "../contexts/DsProxyContext";
import { useIlkList, useVaultContext } from "../contexts/VaultSelectionContext";

interface Props { }

export const OpenVaultButton: React.FC<Props> = ({ children }) => {

    const signer = useSigner()

    const { dsProxy } = useDsProxyContext()

    const dssProxyActions = useContract('DssProxyActions')
    const manager = useContract('DssCdpManager')

    const { vault } = useVaultContext()


    return (
        <div>
            { (vault && !vault.cdp) ?
            <Button
                variant="outlined"
                color="secondary" 
                onClick={async (e) => {
                    e.preventDefault()
                    if (!dssProxyActions || !manager || !dsProxy || !signer || !vault)
                        return
                    try {
                        const transactionResponse = await proxyExecute(
                            dsProxy, 'execute(address,bytes)',
                            dssProxyActions, 'open',[
                                manager.address,
                                formatBytes32String(vault.ilk),
                                dsProxy.address
                            ]
                        )
                        await transactionResponse.wait(1)
                    } catch (error) {
                        console.error(error)                            
                    }

                }}
                size="small">
                Create Vault
            </Button>
            : ''}
        </div>
    )
}
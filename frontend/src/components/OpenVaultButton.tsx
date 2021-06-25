import { formatBytes32String, parseBytes32String } from "@ethersproject/strings";
import { useContract } from "./Deployments";
import { proxyExecute } from "./WipeAndFree";
import { Box, Button, Link, Tooltip, Typography } from "@material-ui/core";
import { useDsProxyContext } from "../contexts/DsProxyContext";
import { useVaultContext } from "../contexts/VaultSelectionContext";
import { useConnectionContext } from "../contexts/ConnectionContext";
import { useBusyBackdrop } from "../hooks/useBusyBackdrop";
import { useSnackbarContext } from "../contexts/SnackbarContext";
import { useVaultInfoContext } from "../contexts/VaultInfoContext";
import { ilkToTokenSymbol } from "./VaultInfo";

interface Props { }

export const OpenVaultButton: React.FC<Props> = ({ children }) => {

    const { signer, chainId } = useConnectionContext()

    const { dsProxy } = useDsProxyContext()

    const dssProxyActions = useContract('DssProxyActions')
    const manager = useContract('DssCdpManager')

    const { vault } = useVaultContext()
    const { vaultInfo } = useVaultInfoContext()

    const { backdrop, setInProgress } = useBusyBackdrop({ color: "secondary"})

    const snackbar = useSnackbarContext()

    return (
        <span>
            { (vault && !vault.cdp) ?
            <Box>
                {backdrop}
                <Tooltip title={
                    <Typography variant="body1" component="span" style={{display: 'inline-block'}}>
                    A vault is where your investment will reside. The vault let you lock collateral
                    (in this case {ilkToTokenSymbol(vaultInfo.ilkInfo.ilk)}) and draw DAI, and use this
                    DAI, for example, to buy more {ilkToTokenSymbol(vaultInfo.ilkInfo.ilk)}. A MakerDAO 
                    vault is required to perform transactions in Deunifi. You can create 
                    your {vaultInfo.ilkInfo.ilk} vault here, or if you prefere you can create it
                    in Oasis App.
                    </Typography>
                }>
                <span>
                <Button
                    variant="outlined"
                    color="secondary" 
                    disabled={dsProxy ? false : true}
                    onClick={async (e) => {
                        e.preventDefault()  
                        if (!dssProxyActions || !manager || !dsProxy || !signer || !vault)
                            return
                        try {
                            setInProgress(true)
                            const transactionResponse = await proxyExecute(
                                dsProxy, 'execute(address,bytes)',
                                dssProxyActions, 'open',[
                                    manager.address,
                                    formatBytes32String(vault.ilk),
                                    dsProxy.address
                                ]
                            )
                            snackbar.transactionInProgress(transactionResponse)
                            await transactionResponse.wait(1)
                            snackbar.transactionConfirmed(transactionResponse)
                        } catch (error) {
                            console.error(error)                            
                        } finally {
                            setInProgress(false)
                        }

                    }}
                    size="small">
                    Create Vault
                </Button>
                </span>
                </Tooltip>
            </Box>
            : <Link href={`https://oasis.app/borrow/${vault?.cdp?.toString()}${chainId === 42 ? '?network=kovan' : ''}`} target="_blank">Open in Oasis</Link>}
        </span>
    )
}
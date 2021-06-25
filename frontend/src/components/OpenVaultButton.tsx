import { formatBytes32String, parseBytes32String } from "@ethersproject/strings";
import { useContract } from "./Deployments";
import { proxyExecute } from "./WipeAndFree";
import { Box, Button, Link } from "@material-ui/core";
import { useDsProxyContext } from "../contexts/DsProxyContext";
import { useVaultContext } from "../contexts/VaultSelectionContext";
import { useConnectionContext } from "../contexts/ConnectionContext";
import { useBusyBackdrop } from "../hooks/useBusyBackdrop";
import { useSnackbarContext } from "../contexts/SnackbarContext";

interface Props { }

export const OpenVaultButton: React.FC<Props> = ({ children }) => {

    const { signer, chainId } = useConnectionContext()

    const { dsProxy } = useDsProxyContext()

    const dssProxyActions = useContract('DssProxyActions')
    const manager = useContract('DssCdpManager')

    const { vault } = useVaultContext()

    const { backdrop, setInProgress } = useBusyBackdrop({ color: "secondary"})

    const snackbar = useSnackbarContext()

    return (
        <span>
            { (vault && !vault.cdp) ?
            <Box>
                {backdrop}
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
            </Box>
            : <Link href={`https://oasis.app/borrow/${vault?.cdp?.toString()}${chainId === 42 ? '?network=kovan' : ''}`} target="_blank">Open in Oasis</Link>}
        </span>
    )
}
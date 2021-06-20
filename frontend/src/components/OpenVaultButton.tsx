import { formatBytes32String, parseBytes32String } from "@ethersproject/strings";
import { useContract } from "./Deployments";
import { proxyExecute } from "./WipeAndFree";
import { Box, Button } from "@material-ui/core";
import { useDsProxyContext } from "../contexts/DsProxyContext";
import { useVaultContext } from "../contexts/VaultSelectionContext";
import { useConnectionContext } from "../contexts/ConnectionContext";
import { useBusyBackdrop } from "../hooks/useBusyBackdrop";

interface Props { }

export const OpenVaultButton: React.FC<Props> = ({ children }) => {

    const { signer } = useConnectionContext()

    const { dsProxy } = useDsProxyContext()

    const dssProxyActions = useContract('DssProxyActions')
    const manager = useContract('DssCdpManager')

    const { vault } = useVaultContext()

    const { backdrop, setInProgress } = useBusyBackdrop({ color: "secondary"})

    return (
        <div>
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
                            await transactionResponse.wait(1)
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
            : ''}
        </div>
    )
}
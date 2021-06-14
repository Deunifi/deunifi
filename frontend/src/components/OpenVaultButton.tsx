import { formatBytes32String, parseBytes32String } from "@ethersproject/strings";
import { useContract } from "./Deployments";
import { proxyExecute } from "./WipeAndFree";
import { Button } from "@material-ui/core";
import { useDsProxyContext } from "../contexts/DsProxyContext";
import { useVaultContext } from "../contexts/VaultSelectionContext";
import { useConnectionContext } from "../contexts/ConnectionContext";

interface Props { }

export const OpenVaultButton: React.FC<Props> = ({ children }) => {

    const { signer } = useConnectionContext()

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
import { useContract } from "./Deployments";
import { TransactionResponse } from "@ethersproject/abstract-provider";
import { Button, Tooltip } from "@material-ui/core";
import { useDsProxyContext } from "../contexts/DsProxyContext";
import { useBusyBackdrop } from "../hooks/useBusyBackdrop";
import { useSnackbarContext } from "../contexts/SnackbarContext";

interface IIlkSelection {
    ilk: string,
}

interface Props { }

export const CreateProxyButton: React.FC<Props> = ({ children }) => {

    const proxyRegistry = useContract('ProxyRegistry')

    const { dsProxy } = useDsProxyContext()

    const { backdrop, setInProgress } = useBusyBackdrop({ color: "secondary"})

    const snackbar = useSnackbarContext()

    return (
        <div>
            <Tooltip title="Please create your proxy to continue">
                <Button
                    fullWidth
                    // size="small"
                    variant="outlined"
                    color='secondary'
                    onClick={async (e) => {
                        e.preventDefault()
                        if (dsProxy || !proxyRegistry)
                            return;
                        try {
                            setInProgress(true)
                            const transactionResponse: TransactionResponse = await proxyRegistry['build()']()
                            snackbar.transactionInProgress(transactionResponse)
                            await transactionResponse.wait(1)
                            snackbar.transactionConfirmed(transactionResponse)
                        } catch (error) {
                            console.error(error)
                        } finally{
                            setInProgress(false)
                        }
                    }}
                >
                Create Proxy
                </Button>
            </Tooltip>
            
            {backdrop}

        </div>
    )
}
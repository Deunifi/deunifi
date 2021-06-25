import { useContract } from "./Deployments";
import { TransactionResponse } from "@ethersproject/abstract-provider";
import { Button, Link, Tooltip, Typography } from "@material-ui/core";
import { useDsProxyContext } from "../contexts/DsProxyContext";
import { useBusyBackdrop } from "../hooks/useBusyBackdrop";
import { useSnackbarContext } from "../contexts/SnackbarContext";
import { useConnectionContext } from "../contexts/ConnectionContext";

interface IIlkSelection {
    ilk: string,
}

interface Props { }

export const CreateProxyButton: React.FC<Props> = ({ children }) => {

    const proxyRegistry = useContract('ProxyRegistry')

    const { dsProxy } = useDsProxyContext()

    const { backdrop, setInProgress } = useBusyBackdrop({ color: "secondary"})

    const snackbar = useSnackbarContext()

    const { web3React } = useConnectionContext()

    return (
        <span>
            <Tooltip title={<Typography variant="body1" component="span" style={{display: 'inline-block'}}>
                A proxy is a contract needed to interact with MakerDAO protocol. 
                To perform Deunifi transactions you must own a MakerDAO proxy. 
                You can create it here, or if you prefere you can create it in the Oasis App.
            </Typography>}>
                <span>
                        <Button
                            disabled={web3React ? !web3React?.active : true}
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
                </span>
            </Tooltip>
            
            {backdrop}

        </span>
    )
}
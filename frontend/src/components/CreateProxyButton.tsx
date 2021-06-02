import { useContract } from "./Deployments";
import { TransactionResponse } from "@ethersproject/abstract-provider";
import { Button, Tooltip } from "@material-ui/core";
import { useDsProxyContext } from "../contexts/DsProxyContext";

interface IIlkSelection {
    ilk: string,
}

interface Props { }

export const CreateProxyButton: React.FC<Props> = ({ children }) => {

    const proxyRegistry = useContract('ProxyRegistry')

    const { dsProxy } = useDsProxyContext()

    return (
        <div>
            <Tooltip title="Please create your proxy to continue">
                <Button
                    size="small"
                    variant="contained"
                    color='secondary'
                    onClick={async (e) => {
                        e.preventDefault()
                        if (dsProxy || !proxyRegistry)
                            return;
                        try {
                            const transactionResponse: TransactionResponse = await proxyRegistry['build()']()
                        } catch (error) {
                            console.error(error)
                        }
                    }}
                >
                Create Proxy
                </Button>
            </Tooltip>

        </div>
    )
}
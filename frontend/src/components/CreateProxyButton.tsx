import { useContract } from "./Deployments";
import { useDSProxyContainer } from "./VaultSelection";
import { TransactionResponse } from "@ethersproject/abstract-provider";
import { Button, Tooltip } from "@material-ui/core";

interface IIlkSelection {
    ilk: string,
}

interface Props { }

export const CreateProxyButton: React.FC<Props> = ({ children }) => {

    const proxyRegistry = useContract('ProxyRegistry')

    const { dsProxy } = useDSProxyContainer()

    return (
        <div>
            <Tooltip title="Please create your proxy to continue">
                <Button
                    size="small"
                    variant="contained"
                    color='primary'
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
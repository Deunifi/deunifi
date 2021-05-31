import { parseBytes32String } from "@ethersproject/strings";
import { useState } from "react";
import { useSigner, useProvider } from "./Connection";
import { useContract } from "./Deployments";
import { useDSProxyContainer } from "./VaultSelection";
import { TransactionResponse } from "@ethersproject/abstract-provider";
import { proxyExecute } from "./WipeAndFree";
import { useEffectAutoCancel } from "../hooks/useEffectAutoCancel";

interface IIlkSelection {
    ilk: string,
}

interface Props { }

export const OpenVault: React.FC<Props> = ({ children }) => {

    const signer = useSigner()

    const proxyRegistry = useContract('ProxyRegistry')
    const ilkRegistry = useContract('IlkRegistry')

    const { dsProxy } = useDSProxyContainer()

    const [ilkList, setIlkList] = useState<string[]>([])
    const [selectedIlk, setSelectedIlk] = useState<string>()

    useEffectAutoCancel(function* (){

        if (!ilkRegistry)
            return

        const list = (yield ilkRegistry['list()']()) as string[]

        setIlkList(list)

    }, [ilkRegistry])

    const dssProxyActions = useContract('DssProxyActions')
    const manager = useContract('DssCdpManager')

    return (
        <div>
            {
                dsProxy? 
                    <p>DSProxy: {dsProxy?.address}</p> : 
                    <p>
                        <label>

                            <button onClick={async (e) => {
                                e.preventDefault()
                                if (dsProxy || !proxyRegistry)
                                    return;
                                const transactionResponse: TransactionResponse = await proxyRegistry['build()']()
                            }}>
                                Create Proxy
                            </button>
                        </label>

                    </p>
            }
            

            <p>
                <select
                    name="Ilk"
                    id="ilk"
                    onChange={(e) => setSelectedIlk(ilkList[e.target.selectedIndex])}
                >
                    {ilkList.map(ilk => (
                        <option value={ilk} key={ilk}>
                            {parseBytes32String(ilk)}
                        </option>
                    ))}
                </select>

                <button onClick={async (e) => {
                    e.preventDefault()
                    if (!dssProxyActions || !manager || !selectedIlk || !dsProxy || !signer)
                        return
                    
                    const signerAddress = await signer.getAddress()

                    proxyExecute(
                        dsProxy, 'execute(address,bytes)',
                        dssProxyActions, 'open',[
                            manager.address,
                            selectedIlk,
                            dsProxy.address
                        ]
                    )
            
                    // await dssProxyActions.open(manager.address, selectedIlk, dsProxy.address)

                }}>
                    Create Vault
                </button>
            </p>
        </div>
    )
}
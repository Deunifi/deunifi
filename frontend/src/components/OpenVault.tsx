import { parseBytes32String } from "@ethersproject/strings";
import { useState } from "react";
import { useSigner } from "./Connection";
import { useContract } from "./Deployments";
import { useDSProxyContainer } from "./VaultSelection";
import { proxyExecute } from "./WipeAndFree";
import { useEffectAutoCancel } from "../hooks/useEffectAutoCancel";

interface Props { }

export const OpenVault: React.FC<Props> = ({ children }) => {

    const signer = useSigner()

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
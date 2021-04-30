import { Contract } from "@ethersproject/contracts";
import { formatBytes32String, parseBytes32String } from "@ethersproject/strings";
import { useWeb3React } from "@web3-react/core";
import { BigNumber, ethers } from "ethers";
import { createContext, DependencyList, EffectCallback, useContext, useEffect, useRef, useState } from "react";
import { isCallLikeExpression } from "typescript";
import { useEffectAsync } from "../hooks/useEffectAsync";
import { useSigner, useProvider } from "./Connection";
import { useContract } from "./Deployments";
import { useDSProxyContainer } from "./VaultSelection";
import { TransactionResponse } from "@ethersproject/abstract-provider";
import { proxyExecute } from "./WipeAndFree";

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

    useEffectAsync(async () => {

        if (!ilkRegistry)
            return

        const count = await ilkRegistry.count()

        const list = await ilkRegistry['list()']()

        setIlkList(list)


    }, [ilkRegistry])

    const dssProxyActions = useContract('DssProxyActions')
    const manager = useContract('DssCdpManager')

    return (
        <div>
            <button onClick={async (e) => {
                e.preventDefault()
                if (dsProxy || !proxyRegistry)
                    return;
                const transactionResponse: TransactionResponse = await proxyRegistry['build()']()
            }}>
                Create Proxy
            </button>

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

        </div>
    )
}
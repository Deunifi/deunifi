import { Contract } from "@ethersproject/contracts";
import { formatBytes32String, parseBytes32String } from "@ethersproject/strings";
import { useWeb3React } from "@web3-react/core";
import { BigNumber, ethers } from "ethers";
import { useEffect, useState } from "react";
import { isCallLikeExpression } from "typescript";
import { useSigner, useProvider } from "./Connection";
import { useContract } from "./Deployments";

export function useDSProxyAddress(){

    const [dsProxyAddress, setDSProxyAddress] = useState<string>()

    const signer = useSigner()
    const proxyRegistry = useContract('ProxyRegistry')

    useEffect(() => {

        const doAsync = async () => {

            if ((!signer) || (!proxyRegistry)){
                setDSProxyAddress(undefined)
                return
            }

            const dsProxyAddress: string = await proxyRegistry.proxies(await signer.getAddress())   
            setDSProxyAddress(dsProxyAddress)

        }

        doAsync()

    }, [proxyRegistry, signer])

    return dsProxyAddress

}


export function useDSProxyContainer(){

    const [dsProxyContainer, setDSProxyContainer] = useState<{dsProxy?:Contract}>({})

    const dsProxyAddress = useDSProxyAddress()
    const dsProxy = useContract('DSProxy')

    useEffect(() => {

        const doAsync = async () => {

            if (!dsProxy || !dsProxyAddress){
                setDSProxyContainer({})
                return
            }
                
            
            setDSProxyContainer({
                dsProxy: dsProxy.attach(dsProxyAddress)
            })

        }

        doAsync()

    }, [dsProxyAddress, dsProxy])

    return dsProxyContainer

}

interface IVaultSelectionItem{
    cdp: BigNumber,
    ilk: string,
}

export function useVaults(){

    const [vaults, setVaults] = useState<IVaultSelectionItem[]>([])

    const dsProxyContainer = useDSProxyContainer()
    const manager = useContract('DssCdpManager')

    useEffect(() => {

        const { dsProxy } = dsProxyContainer

        const doAsync = async () => {

            if (!dsProxy || !manager){
                setVaults([])
                return
            }
            
            const vaults: IVaultSelectionItem[] = []

            // We get the first cdp for DSProxy
            let cdp: BigNumber = await manager.first(dsProxy.address)
            const toResolve = []

            while (!cdp.isZero()){

                // Then we asynchroneously get the ilk for cdp.
                toResolve.push(
                    (async () => {
                        const ilk: string = parseBytes32String(await manager.ilks(cdp))
                        vaults.push({
                            cdp,
                            ilk,
                        })
                    })()
                )

                // And then, we get next cdp for DSProxy
                const {prev, next}: {prev: BigNumber, next: BigNumber} = await manager.list(cdp)
                cdp = next
            }

            await Promise.all(toResolve)

            // TODO Check if sort is needed.
            setVaults(vaults)

        }

        doAsync()

    }, [dsProxyContainer, manager])

    return vaults

}


interface Props { }

export const VaultSelection: React.FC<Props> = () => {
    
    const { dsProxy } = useDSProxyContainer()
    const vaults = useVaults()

    return (
        <div>
            DSProxy: {dsProxy?.address}
            <ul>
                {vaults.map(vault => (
                    <li key={vault.cdp.toString()}>
                        #{vault.cdp.toString()} - {vault.ilk}
                    </li>
                ) )}
            </ul>
        </div>
    )
}
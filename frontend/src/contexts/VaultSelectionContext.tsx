import { parseBytes32String } from "@ethersproject/strings";
import { BigNumber } from "ethers";
import { createContext, Dispatch, useContext, useState } from "react";
import { useBlockContext } from "../contexts/BlockContext";
import { useEffectAutoCancel } from "../hooks/useEffectAutoCancel";
import { useContract } from "../components/Deployments";
import { useDsProxyContext } from "./DsProxyContext";

interface IVaultSelectionItem {
    cdp: BigNumber,
    ilk: string,
}

export function useVaults() {

    const [vaults, setVaults] = useState<IVaultSelectionItem[]>([])

    const { dsProxy } = useDsProxyContext()
    const manager = useContract('DssCdpManager')

    const { blocknumber } = useBlockContext()

    useEffectAutoCancel(function* () {

        if (!dsProxy || !manager) {
            setVaults([])
            return
        }

        const _vaults: IVaultSelectionItem[] = []

        // We get the first cdp for DSProxy
        let cdp: BigNumber = (yield manager.first(dsProxy.address)) as BigNumber
        const toResolve = []

        while (!cdp.isZero()) {

            // Then we asynchroneously get the ilk for cdp.
            toResolve.push(
                (async (cdp: BigNumber) => {
                    const ilk: string = parseBytes32String(await manager.ilks(cdp))
                    if (/UNIV2/.test(ilk)){
                        _vaults.push({
                            cdp,
                            ilk,
                        })    
                    }
                })(cdp)
            )

            // And then, we get next cdp for DSProxy
            const { prev, next }: { prev: BigNumber, next: BigNumber } =
                (yield manager.list(cdp)) as { prev: BigNumber, next: BigNumber }

            cdp = next
        }

        yield Promise.all(toResolve)

        // We check if the retrieved vaults are different than previous list (for blockNumber change).
        if (_vaults.length == vaults.length){
            let differentVaults = false
            for (let i=0; i<vaults.length; i++){
                if (!_vaults[i].cdp.eq(vaults[i].cdp)){
                    differentVaults = true
                    break
                }
            }
            if (!differentVaults)
                return
        }
        
        // TODO Check if sort is needed.
        setVaults([..._vaults])

    }, [dsProxy, manager, blocknumber])

    return vaults

}


interface Props { }

export const VaultSelectionContext = createContext<{ vault?: IVaultSelectionItem, setVault: Dispatch<IVaultSelectionItem> }>({ setVault: () => { console.error('Call to default function')}})
const { Provider } = VaultSelectionContext

export const useVaultContext = () => useContext(VaultSelectionContext)

export const VaultSelectionProvider: React.FC<Props> = ({ children }) => {

    const vaults = useVaults()
    const [vault, setVault] = useState<IVaultSelectionItem>()
    const value = {vault, setVault}

    useEffectAutoCancel(function* (){
        if (vaults.length == 0) {
            setVault(undefined)
        } else {
            setVault(vaults[vaults.length-1])
        }
    }, [vaults])

    return (
        <Provider value={value}>
            {children}
        </Provider>
    )
}
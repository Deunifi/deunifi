import { parseBytes32String } from "@ethersproject/strings";
import { BigNumber } from "ethers";
import { createContext, Dispatch, useContext, useEffect, useState } from "react";
import { useBlockContext } from "../contexts/BlockContext";
import { useEffectAutoCancel } from "../hooks/useEffectAutoCancel";
import { useContract } from "../components/Deployments";
import { useDsProxyContext } from "./DsProxyContext";

function useIlkList(){

    const ilkRegistry = useContract('IlkRegistry')

    useEffectAutoCancel(function* (){

        if (!ilkRegistry){
            setIlkList([])
            return
        }

        const list = (yield ilkRegistry['list()']()) as string[]

        setIlkList(list.filter(ilk => /UNIV2/.test(parseBytes32String(ilk))))

    }, [ilkRegistry])

    const [ilkList, setIlkList] = useState<string[]>([])

    return ilkList

}

interface IUserVaultSelectionItem {
    cdp: BigNumber,
    ilk: string,
}

function useUserVaults() {

    const [vaults, setVaults] = useState<IUserVaultSelectionItem[]>([])

    const { dsProxy } = useDsProxyContext()
    const manager = useContract('DssCdpManager')

    const { blocknumber } = useBlockContext()

    useEffectAutoCancel(function* () {

        if (!dsProxy || !manager) {
            setVaults([])
            return
        }

        const _vaults: IUserVaultSelectionItem[] = []

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

export interface IVaultSelectionItem {
    cdp?: BigNumber,
    ilk: string,
}

function useProtocolVaults() {

    const ilkList = useIlkList()

    const [protocolVaults, setProtocolVaults] = useState<IVaultSelectionItem[]>([])

    useEffect(() => {
        setProtocolVaults(ilkList.map( ilk => ({ ilk: parseBytes32String(ilk) }) ))
    }, [ilkList])

    return protocolVaults

}

interface Props { }

interface IVaultSelectionContextData{
    vault?: IVaultSelectionItem,
    setVault: Dispatch<IVaultSelectionItem>,
    userVaults: IVaultSelectionItem[],
    protocolVaults: IVaultSelectionItem[],
    ilkChanged: boolean,
}

export const VaultSelectionContext = createContext<IVaultSelectionContextData>({
    setVault: () => { console.error('Call to default function')},
    userVaults: [],
    protocolVaults: [],
    ilkChanged: true
})

const { Provider } = VaultSelectionContext

export const useVaultContext = () => useContext(VaultSelectionContext)

export const VaultSelectionProvider: React.FC<Props> = ({ children }) => {

    const protocolVaults = useProtocolVaults()
    const userVaults = useUserVaults()
    const [vault, _setVault] = useState<IVaultSelectionItem>()
    const [ilkChanged, setIlkChanged] = useState<boolean>(true)

    const setVault = (_vault: IVaultSelectionItem|undefined) => {
        setIlkChanged(vault?.ilk != _vault?.ilk)
        _setVault(_vault)
    }

    useEffect(() => {
        // This cenario happens when proxy is created.
        if (vault && !(vault?.cdp) && userVaults.length == 0)
            return
        if (userVaults.length != 0) {
            setVault(userVaults[userVaults.length-1])
        }
        // FIXME
        else if (protocolVaults.length != 0){
            setVault(protocolVaults[0])
        } else {
            setVault(undefined)
        }
    }, [userVaults, protocolVaults])

    return (
        <Provider value={{vault, setVault, userVaults, protocolVaults, ilkChanged}}>
            {children}
        </Provider>
    )
}
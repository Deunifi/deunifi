import { Contract } from "@ethersproject/contracts";
import { parseBytes32String } from "@ethersproject/strings";
import { BigNumber, ethers } from "ethers";
import { createContext, useContext, useState } from "react";
import { useEffectAutoCancel } from "../hooks/useEffectAutoCancel";
import { useSigner, useProvider } from "./Connection";
import { useContract } from "./Deployments";

export function useDSProxyAddress() {

    const [dsProxyAddress, setDSProxyAddress] = useState<string>()

    const signer = useSigner()
    const proxyRegistry = useContract('ProxyRegistry')
    const proxyFactory = useContract('DSProxyFactory')

    useEffectAutoCancel(function* (){

            if ((!signer) || (!proxyRegistry) || (!proxyFactory)) {
                setDSProxyAddress(undefined)
                return
            }

            const signerAddress = (yield signer.getAddress()) as string
            const dsProxyAddress: string = (yield proxyRegistry.proxies(signerAddress)) as string
            setDSProxyAddress(dsProxyAddress)

            proxyFactory.on(
                // event Created(address indexed sender, address indexed owner, address proxy, address cache);
                proxyFactory.filters.Created(null, signerAddress),
                (sender: string, owner: string, proxy: string, cache: string)=>{
                    setDSProxyAddress(proxy)
                }
            )

    }, [proxyRegistry, signer, proxyFactory])

    const provider = useProvider()

    return [dsProxyAddress, setDSProxyAddress]

}


export function useDSProxyContainer() {

    const [dsProxyContainer, setDSProxyContainer] = useState<{ dsProxy?: Contract }>({})

    const dsProxy = useContract('DSProxy')
    const [dsProxyAddress, ] = useDSProxyAddress()

    useEffectAutoCancel(function* (){

            if (!dsProxy || !dsProxyAddress || dsProxyAddress === ethers.constants.AddressZero) {
                setDSProxyContainer({})
                return
            }

            if (dsProxyContainer.dsProxy && dsProxyContainer.dsProxy.address == dsProxyAddress)
                return

            setDSProxyContainer({
                dsProxy: dsProxy.attach(dsProxyAddress as string),
            })

    }, [dsProxyAddress, dsProxy])

    return dsProxyContainer

}

interface IVaultSelectionItem {
    cdp: BigNumber,
    ilk: string,
}

export function useVaults() {

    const [vaults, setVaults] = useState<IVaultSelectionItem[]>([])

    const dsProxyContainer = useDSProxyContainer()
    const manager = useContract('DssCdpManager')

    useEffectAutoCancel(function* () {

        const { dsProxy } = dsProxyContainer

        if (!dsProxy || !manager) {
            setVaults([])
            return
        }

        const vaults: IVaultSelectionItem[] = []

        // We get the first cdp for DSProxy
        let cdp: BigNumber = (yield manager.first(dsProxy.address)) as BigNumber
        const toResolve = []

        while (!cdp.isZero()) {

            // Then we asynchroneously get the ilk for cdp.
            toResolve.push(
                (async (cdp: BigNumber) => {
                    const ilk: string = parseBytes32String(await manager.ilks(cdp))
                    vaults.push({
                        cdp,
                        ilk,
                    })
                })(cdp)
            )

            // And then, we get next cdp for DSProxy
            const { prev, next }: { prev: BigNumber, next: BigNumber } =
                (yield manager.list(cdp)) as { prev: BigNumber, next: BigNumber }

            cdp = next
        }

        yield Promise.all(toResolve)

        // TODO Check if sort is needed.
        setVaults([...vaults])

    }, [dsProxyContainer, manager])

    return vaults

}


interface Props { }

const VaultSelectionContext = createContext<{ vault?: IVaultSelectionItem }>({})
const { Provider } = VaultSelectionContext

export const useVaultContext = () => useContext(VaultSelectionContext)

export const VaultSelection: React.FC<Props> = ({ children }) => {

    const { dsProxy } = useDSProxyContainer()
    const vaults = useVaults()
    const [vault, setVault] = useState<IVaultSelectionItem>()

    useEffectAutoCancel(function* (){
        if (vaults.length == 0) {
            setVault(undefined)
        } else {
            setVault(vaults[0])
        }
    }, [vaults])

    return (
        <div>
            <ul>
                <li>DSProxy: {dsProxy?.address}</li>
                <li>
                    <select
                        name="Vault"
                        id="vault"
                        onChange={(e) => setVault(vaults[e.target.selectedIndex])}
                    >
                        {vaults.map(vault => (
                            <option value={vault.cdp.toString()} key={vault.cdp.toString()}>
                                #{vault.cdp.toString()} - {vault.ilk}
                            </option>
                        ))}
                    </select>
                </li>
                <li>
                    <Provider value={{ vault }}>
                        {children}
                    </Provider>
                </li>
            </ul>
        </div>
    )
}
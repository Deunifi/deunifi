import { Contract } from "@ethersproject/contracts";
import { ethers } from "ethers";
import { createContext, useContext, useState } from "react";
import { useEffectAutoCancel } from "../hooks/useEffectAutoCancel";
import { useSigner, useProvider } from "../components/Connection";
import { useContract } from "../components/Deployments";

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



const DsProxyContext = createContext<{ dsProxy?: Contract }>({ })
const { Provider } = DsProxyContext

export const useDsProxyContext = () => useContext(DsProxyContext)

interface Props { }

export const DsProxyProvider: React.FC<Props> = ({ children }) => {

    const [dsProxyAttached, setDSProxyAttached] = useState<Contract|undefined>()

    const dsProxy = useContract('DSProxy')
    const [dsProxyAddress, ] = useDSProxyAddress()

    useEffectAutoCancel(function* (){

            if (!dsProxy || !dsProxyAddress || dsProxyAddress === ethers.constants.AddressZero) {
                setDSProxyAttached(undefined)
                return
            }

            if (dsProxyAttached && dsProxyAttached.address == dsProxyAddress)
                return

            setDSProxyAttached(dsProxy.attach(dsProxyAddress as string))

    }, [dsProxyAddress, dsProxy])


    return (
        <Provider value={{ dsProxy: dsProxyAttached }}>
            {children}
        </Provider>
    )
}
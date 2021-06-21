import { useState } from "react"
import { useConnectionContext } from "../contexts/ConnectionContext"
import { useEffectAutoCancel } from "./useEffectAutoCancel"

export function useEtherscanBaseUrl() {

    const [baseUrl, setBaseUrl] = useState<string>()

    const {web3React} = useConnectionContext()

    useEffectAutoCancel(function* (){
        if (!web3React || !web3React.chainId)
            setBaseUrl(undefined)
        else
            setBaseUrl({
                42: 'https://kovan.etherscan.io',
                1: 'https://etherscan.io',
            }[web3React.chainId])
    }, [web3React])

    return baseUrl
}
import { useState } from "react"
import { useConnectionContext } from "../contexts/ConnectionContext"
import { useEffectAutoCancel } from "./useEffectAutoCancel"

export function useEtherscanBaseUrl() {

    const [baseUrl, setBaseUrl] = useState<string>()

    const {chainId} = useConnectionContext()

    useEffectAutoCancel(function* (){

        setBaseUrl({
            42: 'https://kovan.etherscan.io',
            1: 'https://etherscan.io',
        }[chainId])

    }, [chainId])

    return baseUrl
}
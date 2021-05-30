
import { useEffect, useState } from "react";
import { useProvider } from "../components/Connection";

export const useBlocknumber = (
    ) => {

    const [blocknumber, setBlocknumber] = useState<any>()
    const provider = useProvider()

    useEffect(() => {
        if (!provider)
            return
        provider.on("block", (_blockNumber) => {
            console.log(_blockNumber);
            
            setBlocknumber( () => _blockNumber )
        })    
    }, [provider])

    return blocknumber

}

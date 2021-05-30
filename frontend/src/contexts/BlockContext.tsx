
import { createContext, useContext, useEffect, useState } from "react";
import { useProvider } from "../components/Connection";

const BlockContext = createContext<{ blocknumber: number }>({ blocknumber: 0 })
const { Provider } = BlockContext

export const useBlockContext = () => useContext(BlockContext)

interface Props { }

export const Block: React.FC<Props> = ({ children }) => {

    const [blocknumber, setBlocknumber] = useState<any>()
    const provider = useProvider()

    useEffect(() => {
        if (!provider)
            return
        if (provider.listenerCount('block') == 0){
            provider.on("block", (_blockNumber) => {
                console.log(_blockNumber);
                
                setBlocknumber( () => _blockNumber )
            })    
        }
    }, [provider])

    return (
        <Provider value={{ blocknumber }}>
            {children}
        </Provider>
    )

}

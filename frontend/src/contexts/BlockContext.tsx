
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { useConnectionContext } from "./ConnectionContext";

const BlockContext = createContext<{ blocknumber: number }>({ blocknumber: 0 })
const { Provider } = BlockContext

export const useBlockContext = () => useContext(BlockContext)

interface Props { }

export const Block: React.FC<Props> = ({ children }) => {

    const currentBlocknumber = useRef<number>(0)
    const lastBlocknumber = useRef<number>(0)
    const [blocknumber, setBlocknumber] = useState<number>(0)
    const setBlockNumberState = useRef(setBlocknumber)
    const { provider } = useConnectionContext()

    useEffect(() => {
        if (!provider)
            return
        if (provider.listenerCount('block') == 0){
            provider.on("block", (_blockNumber) => {
                console.log('Block received', _blockNumber);
                lastBlocknumber.current = _blockNumber
            })    
        }
    }, [provider])

    useEffect(() => {
        setInterval(() => {

            if (lastBlocknumber.current!=currentBlocknumber.current){
                console.log('Block emmited', lastBlocknumber.current);
                currentBlocknumber.current = lastBlocknumber.current
                setBlockNumberState.current(lastBlocknumber.current)
            }

        },15*1000)
    },[])

    return (
        <Provider value={{ blocknumber }}>
            {children}
        </Provider>
    )

}

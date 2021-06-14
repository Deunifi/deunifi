import { useWeb3React } from '@web3-react/core';
import { ethers } from 'ethers'
import { InjectedConnector } from '@web3-react/injected-connector'
import { createContext, useContext, useEffect, useState } from 'react';
import { useEffectAutoCancel } from '../hooks/useEffectAutoCancel';
import { Web3ReactContextInterface } from '@web3-react/core/dist/types';


const injectedConnector = new InjectedConnector({
  supportedChainIds: [
    1, // Mainet
    3, // Ropsten
    4, // Rinkeby
    5, // Goerli
    42, // Kovan
    1337, //localhost
  ],
})

interface IConnectionContextData{
  web3React?: Web3ReactContextInterface<ethers.providers.Web3Provider>,
  provider?: ethers.providers.Web3Provider,
  signer?: ethers.providers.JsonRpcSigner,
  address: string,
  toogleConnection: () => void,
}

const ConnectionContext = createContext<IConnectionContextData>({
  address: ethers.constants.AddressZero,
  toogleConnection: () => {},
})
const { Provider } = ConnectionContext

export const useConnectionContext = () => useContext(ConnectionContext)

interface Props { }

export const ConnectionProvider: React.FC<Props> = ({ children }) => {

  const web3React = useWeb3React<ethers.providers.Web3Provider>()
  
  const [provider, setProvider] = useState<ethers.providers.Web3Provider>()
  const [signer, setSigner] = useState<ethers.providers.JsonRpcSigner>()
  const [address, setAddress] = useState<string>(ethers.constants.AddressZero)


  useEffectAutoCancel(function* (){
    setProvider(web3React.library)
    const signer = web3React.library?.getSigner()
    setSigner(signer)
    if (!signer)
        setAddress(ethers.constants.AddressZero)
    else
        setAddress((yield signer.getAddress()) as string)

  }, [web3React])

    return (
        <Provider value={{ 
          web3React,
          provider, 
          signer,  
          address,
          toogleConnection: () => {
            if (!web3React.active)
              web3React.activate(injectedConnector)
            else
              web3React.deactivate()
          },
        
          }}>
            {children}
        </Provider>
    )

}

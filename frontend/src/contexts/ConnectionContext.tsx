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
  chainId: number,
  web3React?: Web3ReactContextInterface<ethers.providers.Web3Provider>,
  provider?: ethers.providers.Web3Provider | ethers.providers.BaseProvider,
  signer?: ethers.providers.JsonRpcSigner,
  address: string,
  toogleConnection: () => void,
}

const ConnectionContext = createContext<IConnectionContextData>({
  chainId: 1,
  address: ethers.constants.AddressZero,
  toogleConnection: () => {},
})
const { Provider } = ConnectionContext

export const useConnectionContext = () => useContext(ConnectionContext)

interface Props { }

export const ConnectionProvider: React.FC<Props> = ({ children }) => {

  const web3React = useWeb3React<ethers.providers.Web3Provider>()
  
  const [chainId, setChainId] = useState<number>(1)
  const [provider, setProvider] = useState<ethers.providers.Web3Provider | ethers.providers.BaseProvider>()
  const [signer, setSigner] = useState<ethers.providers.JsonRpcSigner>()
  const [address, setAddress] = useState<string>(ethers.constants.AddressZero)


  useEffectAutoCancel(function* (){

    if (provider){
      provider.removeAllListeners()
    }

    if (web3React.active){
      setChainId(web3React.chainId as number)
      const provider = web3React.library as ethers.providers.Web3Provider
      setProvider(provider)
      const signer = provider?.getSigner()
      setSigner(signer)
      if (!signer)
          setAddress(ethers.constants.AddressZero)
      else
          setAddress((yield signer.getAddress()) as string)  

    } else {

      setChainId(1)

      const provider = ethers.getDefaultProvider('homestead', {
        etherscan: 'IPYM7XTJR56VGZUKC6KX69G83MKQ4IT64U',
        infura: '7e3cd13954dc42e1bc364ae293ab5255',
        alchemy: 'Je_8wL-ItalOWTA-qWlP5Sl2R9pG2uTa',
      })

      setProvider(provider)
      setSigner(undefined)
      setAddress(ethers.constants.AddressZero)

    }

  }, [web3React])

    return (
        <Provider value={{ 
          chainId,
          web3React,
          provider, 
          signer,  
          address,
          toogleConnection: async () => {
            if (!web3React.active)
              try {
                await web3React.activate(injectedConnector, undefined, true) 
              } catch (error) {
                alert(`Connection not successful. Maybe you don't have Metamask installed. If this is the case please install Metamask extension.`)
              }
            else
              web3React.deactivate()
          },
        
          }}>
            {children}
        </Provider>
    )

}

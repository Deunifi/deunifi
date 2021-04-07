import { useWeb3React } from '@web3-react/core';
import { ethers } from 'ethers'
import { InjectedConnector } from '@web3-react/injected-connector'
import { useEffect, useState } from 'react';

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

export function useProvider(){
  const web3React = useWeb3React<ethers.providers.Web3Provider>()
  const [provider, setProvider] = useState<ethers.providers.Web3Provider>()

  useEffect(() => {
    setProvider(web3React.library)
  }, [web3React])

  return provider
}

export function useSigner(){
  const web3React = useWeb3React<ethers.providers.Web3Provider>()
  const [signer, setSigner] = useState<ethers.providers.JsonRpcSigner>()

  useEffect(() => {
    setSigner(web3React.library?.getSigner())
  }, [web3React])

  return signer
}

function ConnectButton() {

  const web3React = useWeb3React<ethers.providers.Web3Provider>()
  const signer = useSigner()
  const [address, setAddress] = useState<string>()

  useEffect(() => {
    const doAsync = async () => {
      setAddress(await signer?.getAddress())
    }
    doAsync()
  }, [signer])


  const toogleConnection = () => {
    if (!web3React.active)
      web3React.activate(injectedConnector)
    else
      web3React.deactivate()
  }

  return (
    <div>
      <button onClick={() => toogleConnection()}>
        {web3React.active ? 'Disconnect' : 'Connect'}
      </button>
      <ul>
        <li>Address: {address}</li>
        <li>Chain ID: {web3React.chainId}</li>
      </ul>
    </div>
  );
}

export default ConnectButton;

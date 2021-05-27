import { Contract } from "@ethersproject/contracts";
import { useWeb3React } from "@web3-react/core";
import { ethers } from "ethers";
import { useState } from "react";
import { useEffectAutoCancel } from "../hooks/useEffectAutoCancel";
import { useSigner, useProvider } from "./Connection";

interface IContractDeployment {
    name?: string,
    address: string,
    abi: any,
}

// TODO Add other chanin ids or get this information dynamically
const folderByChainId: any = {
    1337: 'localhost',
    42: 'kovan',
    1: 'mainnet',
}

function folderByQueryParam(){
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('deploymentsFolder')
}

export function useDeploymentsFolder() {

    const web3React = useWeb3React<ethers.providers.Web3Provider>()

    const [deploymentsFolder, setDeploymentsFolder] = useState<string>()

    useEffectAutoCancel(function* (){

            if (!web3React.chainId){
                setDeploymentsFolder(undefined)
                return
            }

            const folder = folderByQueryParam() || folderByChainId[web3React.chainId]
            folder ? 
                setDeploymentsFolder(folder) :
                setDeploymentsFolder(undefined)

    }, [web3React])

    return deploymentsFolder
}

export function useContract(contractName: string){

    const [contract, setContract] = useState<Contract>()

    const deploymentsFolder = useDeploymentsFolder()
    const provider = useProvider()
    const signer = useSigner()

    useEffectAutoCancel(function* (){

            if ((!deploymentsFolder) || (!provider)){
                setContract(undefined)
                return
            }

            const ContractJson: IContractDeployment = (yield import("../hardhat/deployments/"+deploymentsFolder+"/"+contractName+".json")) as IContractDeployment

            let contractInstance = new Contract(
                ContractJson.address,
                ContractJson.abi,
                provider
            )

            if (signer)
                contractInstance = contractInstance.connect(signer)

            setContract(contractInstance)

    }, [provider, deploymentsFolder, signer])

    return contract

}

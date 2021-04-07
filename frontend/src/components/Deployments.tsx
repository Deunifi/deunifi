import { Contract } from "@ethersproject/contracts";
import { useWeb3React } from "@web3-react/core";
import { ethers } from "ethers";
import { useEffect, useState } from "react";
import { useSigner, useProvider } from "./Connection";

interface IContractDeployment {
    name?: string,
    address: string,
    abi: any,
}

// TODO Add other chanin ids or get this information dynamically
const folderByChainId: any = {
    1337: 'localhost',
}

export function useDeploymentsFolder() {

    const web3React = useWeb3React<ethers.providers.Web3Provider>()

    const [deploymentsFolder, setDeploymentsFolder] = useState<string>()

    useEffect(() => {

        const doAsync = async () => {

            if (!web3React.chainId){
                setDeploymentsFolder(undefined)
                return
            }
                

            const folder = folderByChainId[web3React.chainId]
            folder ? 
                setDeploymentsFolder(folder) :
                setDeploymentsFolder(undefined)

        }

        doAsync()

    }, [web3React])

    return deploymentsFolder
}

export function useContract(contractName: string){

    const [contract, setContract] = useState<Contract>()

    const deploymentsFolder = useDeploymentsFolder()
    const provider = useProvider()
    const signer = useSigner()

    useEffect(() => {

        const doAsync = async () => {

            if ((!deploymentsFolder) || (!provider)){
                setContract(undefined)
                return
            }

            const ContractJson: IContractDeployment = await import("../hardhat/deployments/"+deploymentsFolder+"/"+contractName+".json")

            let contractInstance = new Contract(
                ContractJson.address,
                ContractJson.abi,
                provider
            )

            if (signer)
                contractInstance = contractInstance.connect(signer)

            setContract(contractInstance)

        }

        doAsync()

    }, [provider, deploymentsFolder, signer])

    return contract

}

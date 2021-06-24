import { Contract } from "@ethersproject/contracts";
import { useState } from "react";
import { useConnectionContext } from "../contexts/ConnectionContext";
import { useEffectAutoCancel } from "../hooks/useEffectAutoCancel";

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

    const {chainId} = useConnectionContext()

    const [deploymentsFolder, setDeploymentsFolder] = useState<string>()

    useEffectAutoCancel(function* (){

        const folder = folderByQueryParam() || folderByChainId[chainId]
        folder ? 
            setDeploymentsFolder(folder) :
            setDeploymentsFolder(undefined)

    }, [chainId])

    return deploymentsFolder
}

export function useContract(contractName: string){

    const [contract, setContract] = useState<Contract>()

    const deploymentsFolder = useDeploymentsFolder()
    const {provider, signer} = useConnectionContext()

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

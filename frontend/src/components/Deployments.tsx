import { Contract } from "@ethersproject/contracts";
import { useWeb3React } from "@web3-react/core";
import { ethers } from "ethers";
import React, { useEffect, useState } from "react";
import { Greeter } from "./Greeter";

interface IDeployments {
    greeter?: Contract
}

interface IContractDeployment {
    address: string,
    abi: any,
}

export const DeploymentsContext = React.createContext<IDeployments>({});

export const Deployments: React.FC<{}> = () => {

    const web3React = useWeb3React<ethers.providers.Web3Provider>()
    const [deployments, setDeployments] = useState<IDeployments>({})

    useEffect(() => {

        const doAsync = async () => {

            if (!web3React.active)
                return

            // TODO Change localhost directory dynamically depending on web3React.chainId value.
            const GreeterDeployment: IContractDeployment = require('../hardhat/deployments/localhost/Greeter.json')

            let greeter = new Contract(
                GreeterDeployment.address,
                GreeterDeployment.abi,
                web3React.library
            )

            // TODO Use context for signer.
            const signer = await web3React.library?.getSigner()

            if (signer)
                greeter = greeter.connect(signer)

            setDeployments({
                greeter
            })

        }

        doAsync()

    }, [web3React])

    return (
        <DeploymentsContext.Provider value={deployments}>
            <Greeter></Greeter>
        </DeploymentsContext.Provider>
    )
}


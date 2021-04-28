import { Contract } from "@ethersproject/contracts";
import { formatBytes32String, parseBytes32String } from "@ethersproject/strings";
import { useWeb3React } from "@web3-react/core";
import { BigNumber, ethers } from "ethers";
import { createContext, DependencyList, EffectCallback, useContext, useEffect, useRef, useState } from "react";
import { isCallLikeExpression } from "typescript";
import { useEffectAsync } from "../hooks/useEffectAsync";
import { useSigner, useProvider } from "./Connection";
import { useContract } from "./Deployments";
import { useDSProxyContainer } from "./VaultSelection";
import { TransactionResponse } from "@ethersproject/abstract-provider";

interface IIlkSelection {
    ilk: string,
}

interface Props { }

export const OpenVault: React.FC<Props> = ({ children }) => {

    const proxyRegistry = useContract('ProxyRegistry')

    const { dsProxy } = useDSProxyContainer()



    return (
        <div>
            <button onClick={async (e) => {
                e.preventDefault()
                if (dsProxy || !proxyRegistry)
                    return;
                const transactionResponse: TransactionResponse = await proxyRegistry['build()']()
            }}>
                Create Proxy
            </button>
        </div>
    )
}
import { BigNumber } from "@ethersproject/bignumber";
import { ethers } from "ethers";
import { DependencyList, MutableRefObject, useEffect, useRef, useState } from "react";
import { useSigner } from "../components/Connection";
import { useContract } from "../components/Deployments";
import { useEffectAsync } from "./useEffectAsync";

type EffectAsyncCallback = () => Promise<void>;

type FeeCalculationFunction = (amount: BigNumber) => Promise<BigNumber>
type FinalAmountCalculationFunction = (amount: BigNumber) => Promise<BigNumber>
const zeroFunction: FeeCalculationFunction = async (amount:BigNumber) => ethers.constants.Zero
const identityFunction: FeeCalculationFunction = async (amount:BigNumber) => amount


interface ServiceFee{
    getFeeFromGrossAmount: FeeCalculationFunction
    getGrossAmountFromNetAmount: FinalAmountCalculationFunction
}

const zeroServiceFee: ServiceFee = {
    getFeeFromGrossAmount: zeroFunction,
    getGrossAmountFromNetAmount: identityFunction
}

/**
 * Waits that previous execution of asyncFunction to finish, before start again.
 * This is to prevent inconsistent values during render (for exemple if the actual
 * execution of the effect finish before the previous execution).
 * @lastCallRef Should be initialized in a component using useRef(Promise.resolve()).
 * @param asyncFunction 
 * @param deps 
 */
export const useServiceFee = () => {

    const feeManager = useContract('FeeManager') // feeManager ABI should be available, no matters if it is deployed.
    const removePosition = useContract('RemovePosition')

    const signer = useSigner()
    const [serviceFee, setServiceFee] = useState<ServiceFee>(zeroServiceFee)

    useEffectAsync(async () => {
        
        if (!feeManager || !removePosition || !signer){
            setServiceFee(zeroServiceFee)
            return
        }

        const feeManagerAddress = await removePosition.feeManager()

        if (feeManagerAddress == ethers.constants.AddressZero){
            setServiceFee(zeroServiceFee)
            return
        }
            
        const feeManagerAttached = await feeManager.attach(feeManagerAddress)

        const signerAddress = await signer.getAddress();

        setServiceFee( {
            getFeeFromGrossAmount: async (amount:BigNumber) => await feeManagerAttached.getFeeFromGrossAmount(signerAddress, amount),
            getGrossAmountFromNetAmount: async (amount:BigNumber) => await feeManagerAttached.getGrossAmountFromNetAmount(signerAddress, amount),
        })

    }, [feeManager, removePosition])

    return { ...serviceFee }

}

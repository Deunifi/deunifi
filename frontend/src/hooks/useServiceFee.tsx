import { BigNumber } from "@ethersproject/bignumber";
import { ethers } from "ethers";
import { DependencyList, MutableRefObject, useEffect, useRef, useState } from "react";
import { useContract } from "../components/Deployments";
import { useEffectAsync } from "./useEffectAsync";

type EffectAsyncCallback = () => Promise<void>;

type FeeCalculationFunction = (amount: BigNumber) => Promise<BigNumber>
const feeCalculationFunctionZero: FeeCalculationFunction = async (amount:BigNumber) => ethers.constants.Zero

interface ServiceFee{
    getServiceFee: FeeCalculationFunction
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
    const [serviceFee, setServiceFee] = useState<ServiceFee>({getServiceFee: feeCalculationFunctionZero})

    useEffectAsync(async () => {

        
        if (!feeManager || !removePosition){
            // TODO enable undefined
            setServiceFee({getServiceFee: feeCalculationFunctionZero})
            return
        }

        const feeManagerAddress = await removePosition.feeManager()

        if (feeManagerAddress == ethers.constants.AddressZero){
            setServiceFee({getServiceFee: feeCalculationFunctionZero})
            return
        }
            
        const feeManagerAttached = await feeManager.attach(feeManagerAddress)

        setServiceFee( {getServiceFee: async (amount:BigNumber) => await feeManagerAttached.getFee(amount)} )

    }, [feeManager, removePosition])

    return { ...serviceFee }

}

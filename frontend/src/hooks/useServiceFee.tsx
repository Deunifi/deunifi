import { BigNumber } from "@ethersproject/bignumber";
import { parseUnits } from "@ethersproject/units";
import { Contract, ethers } from "ethers";
import { useState } from "react";
import { useContract } from "../components/Deployments";
import { useConnectionContext } from "../contexts/ConnectionContext";
import { useEffectAutoCancel } from "./useEffectAutoCancel";

type EffectAsyncCallback = () => Promise<void>;

type FeeCalculationFunction = (amount: BigNumber) => Promise<BigNumber>
type FinalAmountCalculationFunction = (amount: BigNumber) => Promise<BigNumber>
const zeroFunction: FeeCalculationFunction = async (amount:BigNumber) => ethers.constants.Zero
const identityFunction: FeeCalculationFunction = async (amount:BigNumber) => amount


interface ServiceFee{
    getFeeFromGrossAmount: FeeCalculationFunction
    getGrossAmountFromNetAmount: FinalAmountCalculationFunction,
    serviceFeeRatio: BigNumber, // 4 decimals
}

const zeroServiceFee: ServiceFee = {
    getFeeFromGrossAmount: zeroFunction,
    getGrossAmountFromNetAmount: identityFunction,
    serviceFeeRatio: ethers.constants.Zero
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
    const deunifi = useContract('Deunifi')

    const { address, provider } = useConnectionContext()
    const [serviceFee, setServiceFee] = useState<ServiceFee>(zeroServiceFee)

    useEffectAutoCancel(function* (){
        
        if (!feeManager || !deunifi || !provider){
            setServiceFee(zeroServiceFee)
            return
        }

        const feeManagerAddress = (yield deunifi.feeManager()) as string

        if (feeManagerAddress == ethers.constants.AddressZero){
            setServiceFee(zeroServiceFee)
            return
        }
        
        const feeManagerAttachedPromise = feeManager.attach(feeManagerAddress)

        const feeManagerAttached = (yield feeManagerAttachedPromise) as Contract
        const signerAddress = address

        const storageData = (yield provider.getStorageAt(feeManagerAddress, '0x1')) as string
        const offset = 34
        const hexStringFeeRatio = storageData.substring(offset,offset+32)
        const serviceFeeRatio = BigNumber.from('0x'+hexStringFeeRatio)

        setServiceFee( {
            getFeeFromGrossAmount: async (amount:BigNumber) => {
                if (amount.isNegative())
                    return ethers.constants.Zero
                return await feeManagerAttached.getFeeFromGrossAmount(signerAddress, amount)
            },
            getGrossAmountFromNetAmount: async (amount:BigNumber) => {
                if (amount.isNegative())
                    return ethers.constants.Zero
                return await feeManagerAttached.getGrossAmountFromNetAmount(signerAddress, amount)
            },
            serviceFeeRatio
        })

    }, [feeManager, deunifi])

    return { ...serviceFee }

}

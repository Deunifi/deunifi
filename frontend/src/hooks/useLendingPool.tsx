import { BigNumber } from "@ethersproject/bignumber";
import { Contract, ethers } from "ethers";
import { useState } from "react";
import { useContract } from "../components/Deployments";
import { useEffectAutoCancel } from "./useEffectAutoCancel";

type LoanFeeCalculationFunction = (amount: BigNumber) => BigNumber
const zeroFunction: LoanFeeCalculationFunction = () => ethers.constants.Zero


interface ILendingPool{
    contract?: Contract,
    getLoanFee: LoanFeeCalculationFunction,
    loanFeeRatio: BigNumber, // 4 decimals
}

const initialLendingPool: ILendingPool = {
    getLoanFee: zeroFunction,
    loanFeeRatio: ethers.constants.Zero
}

export const useLendingPool = () => {

    const lendingPoolAddressesProvider = useContract('LendingPoolAddressesProvider')
    const lendingPoolContract = useContract('LendingPool')

    const [lendingPoolState, setLendingPoolState] = useState<ILendingPool>(initialLendingPool)

    useEffectAutoCancel(function* (){

        const lendingPool = {...initialLendingPool}
        
        if (!lendingPoolAddressesProvider || !lendingPoolContract){
            setLendingPoolState(lendingPool)
            return
        }

        lendingPool.contract = lendingPoolContract.attach((yield lendingPoolAddressesProvider.getLendingPool()) as string)
        lendingPool.loanFeeRatio = (yield lendingPool.contract.FLASHLOAN_PREMIUM_TOTAL()) as BigNumber
        lendingPool.getLoanFee = (amount: BigNumber) => amount.mul(lendingPool.loanFeeRatio).div(10000)

        setLendingPoolState(lendingPool)

    }, [lendingPoolAddressesProvider, lendingPoolContract])

    return lendingPoolState

}

import { BigNumber } from "@ethersproject/bignumber";
import { Contract, ethers } from "ethers";
import { formatUnits, parseUnits } from "ethers/lib/utils";
import { useState } from "react";
import { useContract } from "../components/Deployments";
import { useEffectAutoCancel } from "./useEffectAutoCancel";

type LoanFeeCalculationFunction = (amount: BigNumber) => BigNumber
const zeroFunction: LoanFeeCalculationFunction = () => ethers.constants.Zero


interface ILendingPool{
    contract?: Contract,
    getLoanFee: LoanFeeCalculationFunction,
    loanFeeRatio: BigNumber, // 18 decimals
    useAave: boolean,
}

const initialLendingPool: ILendingPool = {
    getLoanFee: zeroFunction,
    loanFeeRatio: ethers.constants.Zero,
    useAave: true,
}

export const useLendingPool = () => {

    const lendingPoolAddressesProvider = useContract('LendingPoolAddressesProvider')
    const lendingPoolContract = useContract('LendingPool')
    const dssFlash = useContract('DssFlash')

    const [lendingPoolState, setLendingPoolState] = useState<ILendingPool>(initialLendingPool)

    useEffectAutoCancel(function* (){

        const lendingPool = {...initialLendingPool}
        
        if (!lendingPoolAddressesProvider || !lendingPoolContract || !dssFlash){
            setLendingPoolState(lendingPool)
            return
        }

        const aaveLendingPoolAddressPromise = lendingPoolAddressesProvider.getLendingPool()

        const makerFeeRatioPromise = dssFlash.toll()

        const aaveLendingPoolContract = lendingPoolContract.attach((yield aaveLendingPoolAddressPromise) as string)
        const aaveFeeRatio = ((yield aaveLendingPoolContract.FLASHLOAN_PREMIUM_TOTAL()) as BigNumber).mul(parseUnits('1',14))
        const makerFeeRatio = ((yield makerFeeRatioPromise) as BigNumber)

        if (makerFeeRatio.lt(aaveFeeRatio)){
            lendingPool.contract = dssFlash
            lendingPool.loanFeeRatio = makerFeeRatio
            lendingPool.useAave = false
        } else {
            lendingPool.contract = aaveLendingPoolContract
            lendingPool.loanFeeRatio = aaveFeeRatio
            lendingPool.useAave = true
        }

        lendingPool.getLoanFee = (amount: BigNumber) => amount.mul(lendingPool.loanFeeRatio).div(ethers.constants.WeiPerEther)

        setLendingPoolState(lendingPool)

    }, [lendingPoolAddressesProvider, lendingPoolContract, dssFlash])

    return lendingPoolState

}

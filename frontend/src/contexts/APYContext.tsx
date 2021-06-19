import { gql, useLazyQuery } from "@apollo/client";
import { BigNumber } from "@ethersproject/bignumber";
import { formatEther, formatUnits } from "@ethersproject/units";
import { ethers } from "ethers";
import React, { createContext, useContext, useEffect, useState } from "react";
import { useEffectAutoCancel } from "../hooks/useEffectAutoCancel";
import { useVaultExpectedStatusContext } from "./VaultExpectedStatusContext";
import { useVaultInfoContext } from "./VaultInfoContext";
import { useVaultContext } from "./VaultSelectionContext";

interface IApy{
    calculationDaysQuantity: number,
    ilkApy: number,
    vaultApy: number,
    vaultExpectedApy: number,
    setCalculationDays: React.Dispatch<React.SetStateAction<number>>,
}

const initialApy: IApy = {
    calculationDaysQuantity: 0,
    ilkApy: 0,
    vaultApy: 0,
    vaultExpectedApy: 0,
    setCalculationDays: () => {},
}

const ApyContext = createContext<{ apy: IApy }>({ apy: initialApy })
const { Provider } = ApyContext

export const useApyContext = () => useContext(ApyContext)

interface Props { }

export const DEFAULT_APY_DAYS=30
export const MAX_APY_DAYS=60

const LAST_DAYS = gql`query LastDays($pairAddress: String!, $dateFrom: Int!, $days: Int!) {
    pairDayDatas(first: $days, orderBy: date, orderDirection: asc,
        where: {
            pairAddress: $pairAddress,
            date_gt: $dateFrom
        }
    ) {
        date
        dailyVolumeUSD
        reserveUSD
    }
}`

const apyFromRealApd = (data: any): number => {
    return data.pairDayDatas.reduce(
        (apd: number, x: any) => {
            if (Number(x.reserveUSD) == 0)
                return apd
            return apd*(1+Number(x.dailyVolumeUSD)*.003/Number(x.reserveUSD))
        },
        1
    )
    **(365/data.pairDayDatas.length)
}

/**
 * The results of this strategy are generally lower than apyFromRealApd.
 * This strategy appearse to be more conservative and secure.
 * 
 */
const apyFromTotalDailyVolumeUSDDividedByAverageOfTotalReserveUSD = (data: any): number => {
    const [totalDailyVolumeUSD, totalReserveUSD] = data.pairDayDatas.reduce(
        ([totalDailyVolumeUSD, totalReserveUSD]: number[], x: any) => {
            return [totalDailyVolumeUSD+Number(x.dailyVolumeUSD), totalReserveUSD+Number(x.reserveUSD)]
        },
        [0, 0]
    )
    if (totalReserveUSD == 0)
        return 1
    else
        return (1+(totalDailyVolumeUSD*data.pairDayDatas.length*.003/totalReserveUSD))**(365/data.pairDayDatas.length)
}

/**
 * The results of this strategy I think are too high to be real.
 */
const apyFromApyAverage = (data: any): number => {
    const sumOfApys = data.pairDayDatas.reduce(
        (sumOfApysUntilNow: number, x: any) => {
            if (x.reserveUSD == 0)
                return sumOfApysUntilNow
            const currentApy = (1+(Number(x.dailyVolumeUSD)*.003/Number(x.reserveUSD)))**(365)
            return sumOfApysUntilNow + currentApy
        },
        0
    )
    if (sumOfApys == 0)
        return 1
    else
        return sumOfApys/data.pairDayDatas.length
}

/**
 * The results returned by this calculation strategy are almost identical with
 * apyFromRealApd.
 */
const apyFromApdAverage = (data: any): number => {
    const sumOfApds = data.pairDayDatas.reduce(
        (sumOfApdsUntilNow: number, x: any) => {
            if (x.reserveUSD == 0)
                return sumOfApdsUntilNow
            const currentApd = 1+(Number(x.dailyVolumeUSD*.003)/Number(x.reserveUSD))
            return sumOfApdsUntilNow + currentApd
        },
        0
    )
    if (sumOfApds == 0)
        return 1
    else
        return (sumOfApds/data.pairDayDatas.length)**(365)
}

const apyCalculationStrategy = apyFromTotalDailyVolumeUSDDividedByAverageOfTotalReserveUSD

export const APYProvider: React.FC<Props> = ({ children }) => {

    const [apy, setApy] = useState<IApy>(initialApy)
    const { vaultInfo } = useVaultInfoContext()
    const { vaultExpectedStatus } = useVaultExpectedStatusContext()
    const [days, setDays] = useState<number>(DEFAULT_APY_DAYS)


    // TODO Handle error using data.errors or error
    const [getDailyData, { data }] = useLazyQuery(LAST_DAYS)

    useEffect(() => {

        if (!vaultInfo.ilkInfo.univ2Pair){
            setApy({...initialApy, setCalculationDays: setDays})
            return
        }

        const dateFrom = new Date()
        dateFrom.setDate(dateFrom.getDate()-days-1)

        const dateFromUnixTimeStamp = Math.floor(dateFrom.getTime()/1000)

        getDailyData({ 
            variables: {
                pairAddress: vaultInfo.ilkInfo.univ2Pair.address,
                dateFrom: dateFromUnixTimeStamp, 
                days: days
            }
        })

        setApy({...apy, calculationDaysQuantity: days, setCalculationDays: setDays})

    }, [vaultInfo, days])

    useEffectAutoCancel(function* (){

        const apy: IApy = {...initialApy, setCalculationDays: setDays, calculationDaysQuantity: days}

        if (!data){
            return

        }

        if (data.pairDayDatas.length == 0)
            apy.ilkApy = 1
        else{

            // console.log('data.pairDayDatas.length', data.pairDayDatas.length);
            // console.log('apyFromRealApd', apyFromRealApd(data))
            // console.log('apyFromTotalDailyVolumeUSDDividedByAverageOfTotalReserveUSD', apyFromTotalDailyVolumeUSDDividedByAverageOfTotalReserveUSD(data))
            // console.log('apyFromApyAverage', apyFromApyAverage(data))
            // console.log('apyFromApdAverage', apyFromApdAverage(data))

            apy.ilkApy = apyCalculationStrategy(data)

        }

        apy.calculationDaysQuantity = data.pairDayDatas.length

        const collateralizationRatio = Number(formatEther(vaultInfo.collateralizationRatio))
        const stabilityFee = Number(formatUnits(vaultInfo.duty, 27)) ** 31536000 //31536000: seconds in a year

        // vaultAPY =
        // = (vaultValueUSD*apy + dart*(apy-vaultFee)) / vaultValueUSD =
        // = apy + dart*(apy-vaultFee) / vaultValueUSD
        // = apy + (apy-vaultFee) / ( vaultValueUSD / dart)
        // = apy + (apy-vaultFee) / ( (collaterallizationRatio - 1)*dart / dart)
        // = apy + (apy-vaultFee) / (collaterallizationRatio - 1)
        if (collateralizationRatio>1)
            apy.vaultApy = apy.ilkApy + (apy.ilkApy-stabilityFee) / (collateralizationRatio - 1)

        const expectedCollateralizationRatio = Number(formatEther(vaultExpectedStatus.collateralizationRatio))

        if (expectedCollateralizationRatio>1)
            apy.vaultExpectedApy = apy.ilkApy + (apy.ilkApy-stabilityFee) / (expectedCollateralizationRatio - 1)

        setApy(apy)

    }, [data, vaultInfo, vaultExpectedStatus])

    return (
        <Provider value={{apy}}>
            {children}
        </Provider>
    )

}

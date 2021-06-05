import { gql, useLazyQuery } from "@apollo/client";
import { BigNumber } from "@ethersproject/bignumber";
import { formatEther, formatUnits } from "@ethersproject/units";
import { ethers } from "ethers";
import React, { createContext, useContext, useEffect, useState } from "react";
import { useEffectAutoCancel } from "../hooks/useEffectAutoCancel";
import { useVaultExpectedStatusContext } from "./VaultExpectedStatusContext";
import { useVaultInfoContext } from "./VaultInfoContext";

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

const DAYS=30

const LAST_DAYS = gql`query Dog($pairAddress: String!, $dateFrom: Int!, $days: Int!) {
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

export const APYProvider: React.FC<Props> = ({ children }) => {

    const [apy, setApy] = useState<IApy>(initialApy)
    const { vaultInfo } = useVaultInfoContext()
    const { vaultExpectedStatus } = useVaultExpectedStatusContext()
    const [days, setDays] = useState<number>(DAYS)


    const [getDailyData, { data }] = useLazyQuery(LAST_DAYS)

    useEffect(() => {

        if (!vaultInfo.ilkInfo.univ2Pair){
            setApy({...initialApy, setCalculationDays: setDays})
            return
        }

        const dateFrom = new Date()
        dateFrom.setDate(dateFrom.getDate()-days)

        const dateFromUnixTimeStamp = Math.floor(dateFrom.getTime()/1000)

        getDailyData({ 
            variables: {
                pairAddress: vaultInfo.ilkInfo.univ2Pair.address,
                dateFrom: dateFromUnixTimeStamp, 
                days: days
            }
        })

    }, [vaultInfo, days])

    useEffectAutoCancel(function* (){

        const apy: IApy = {...initialApy, setCalculationDays: setDays}

        if (!data){
            return

        }

        if (data.pairDayDatas.length == 0)
            apy.ilkApy = 1
        else{
            apy.ilkApy = data.pairDayDatas.reduce(
                (apd: number, x: any) => {
                    if (Number(x.reserveUSD) == 0)
                        return apd
                    return apd*(1+Number(x.dailyVolumeUSD)*.003/Number(x.reserveUSD))
                },
                1
            )
            **(365/data.pairDayDatas.length)    
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

import { gql, useLazyQuery } from "@apollo/client";
import { createContext, useContext, useEffect, useState } from "react";
import { useEffectAutoCancel } from "../hooks/useEffectAutoCancel";
import { useVaultInfoContext } from "./VaultInfoContext";

const ApyContext = createContext<{ apy: number }>({ apy: 0 })
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

    const [apy, setApy] = useState<number>(0)
    const { vaultInfo } = useVaultInfoContext()

    const [getDailyData, { data }] = useLazyQuery(LAST_DAYS)

    useEffect(() => {

        if (!vaultInfo.ilkInfo.univ2Pair){
            setApy(0)
            return
        }

        const dateFrom = new Date()
        dateFrom.setDate(dateFrom.getDate()-DAYS)

        const dateFromUnixTimeStamp = Math.floor(dateFrom.getTime()/1000)

        getDailyData({ 
            variables: {
                pairAddress: vaultInfo.ilkInfo.univ2Pair.address,
                dateFrom: dateFromUnixTimeStamp, 
                days: DAYS
            }
        })

    }, [vaultInfo])

    useEffectAutoCancel(function* (){

        if (!data)
            return

        const _apy = data.pairDayDatas.reduce(
            (apd: number, x: any) => apd*(1+Number(x.dailyVolumeUSD)*.003/Number(x.reserveUSD)),
            1
        )
        **(365/data.pairDayDatas.length)

        setApy(_apy)

    }, [data])

    return (
        <Provider value={{ apy }}>
            {children}
        </Provider>
    )

}

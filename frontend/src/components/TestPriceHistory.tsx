
import { useLazyQuery } from "@apollo/client";
import { BigNumber } from "@ethersproject/bignumber";
import { id } from "@ethersproject/hash";
import { formatBytes32String } from "@ethersproject/strings";
import gql from "graphql-tag";
import { useEffect, useState } from "react";
import { DEFAULT_APY_DAYS, useApyContext } from "../contexts/APYContext";
import { useConnectionContext } from "../contexts/ConnectionContext";
import { useVaultInfoContext } from "../contexts/VaultInfoContext";
import { useVaultContext } from "../contexts/VaultSelectionContext";
import { useEffectAutoCancel } from "../hooks/useEffectAutoCancel";
import { useContract } from "./Deployments";

interface Props { }

const PRICES = gql`query Prices($pairAddress: String!, $dateFrom: Int!, $days: Int!) {
    pairDayDatas(first: $days, orderBy: date, orderDirection: asc,
        where: {
            pairAddress: $pairAddress,
            date_gt: $dateFrom
        }
    ) {
        date
        reserve0
        reserve1
    }
}`

export const TestPriceHistory: React.FC<Props> = ({ children }) => {

    // Prices from PIP

    const { provider } = useConnectionContext()
    const pip = useContract('Pip')
    const spotter = useContract('Spotter')
    const { vault } = useVaultContext()

    useEffectAutoCancel(function* (){
        if (!provider || !pip || !vault || !spotter)
            return
        const bytes32Ilk = formatBytes32String(vault.ilk)
        const spotterIlksPromise = spotter.ilks(bytes32Ilk)
        const ilk = (yield spotterIlksPromise) as { mat: BigNumber, pip: string }
        const { mat, pip: pipAddress }: { mat: BigNumber, pip: string } = ilk
        const pipAttached = pip.attach(pipAddress)
        
        const queryFilterResult = yield pipAttached.queryFilter(
            // pipAttached.filters.Value(null, null),
            {
                address: pipAddress,
                topics: [
                    id("Value(uint128,uint128)")
                ]
            },
            12434702) as any

        console.log(queryFilterResult)

    }, [provider, spotter, pip, vault])



    // Prices from UNIV2 metrics.

    const [getPrices, { data: prices }] = useLazyQuery(PRICES)
    const { vaultInfo } = useVaultInfoContext()
    const [ days, setDays ] = useState<number>(DEFAULT_APY_DAYS)

    const { apy } = useApyContext()

    useEffect( () => {
        setDays(apy.calculationDaysQuantity)
    }, [apy])

    useEffect(() => {

        if (!vaultInfo.ilkInfo.univ2Pair)
            return

        const dateFrom = new Date()
        dateFrom.setDate(dateFrom.getDate()-days-1)

        const dateFromUnixTimeStamp = Math.floor(dateFrom.getTime()/1000)

        getPrices({ 
            variables: {
                pairAddress: vaultInfo.ilkInfo.univ2Pair.address,
                dateFrom: dateFromUnixTimeStamp, 
                days: days
            }
        })
    }, [days, vaultInfo])

    useEffect(() => {

        if (!prices)
            return
        
        console.log(prices.pairDayDatas.filter(
            (x:any) => (Number(x.reserve0)/Number(x.reserve1)>1.05 || Number(x.reserve1)/Number(x.reserve0)>1.05)
        ));

    }, [prices])


    return (
        <span></span>
    )

}



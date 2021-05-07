import { BigNumber } from "@ethersproject/bignumber";
import { Contract, errors, ethers } from "ethers";
import { DependencyList, MutableRefObject, useEffect, useRef, useState } from "react";
import { factory } from "typescript";
import { useSigner } from "../components/Connection";
import { useContract } from "../components/Deployments";
import { useEffectAsync } from "./useEffectAsync";

interface ITopLiquidityToken{
    address: string,
    symbol: string,
}

interface IGetAmountsInResult{
    path: string[],
    amountFrom: BigNumber
}

type GetAmountsInFunction = (tokenFrom: string, tokenTo: string, amountTo: BigNumber) => Promise<IGetAmountsInResult>
const initialGetAmountsInResult = { path:[], amountFrom: ethers.constants.Zero }
const zeroFunction: GetAmountsInFunction = async () => initialGetAmountsInResult

const pathExists = async (factory:Contract, path: string[]): Promise<boolean> => {
    const pairAddressesPromises: string[] = []
    for (let i=0; i<path.length-1; i++){
        pairAddressesPromises.push(factory.getPair(path[i], path[i+1]))
    }
    const zeroAddresses = (await Promise.all(pairAddressesPromises))
        .filter(pairAddress => pairAddress == ethers.constants.AddressZero)
    
    return zeroAddresses.length == 0
}

const getAmountsIn = async (factory: Contract, router02: Contract, tokenFrom: string, tokenTo: string, amountTo: BigNumber, TOP_UNIV2_LIQUIDITY_TOKENS: ITopLiquidityToken[]): Promise<IGetAmountsInResult> => {

    if (tokenFrom == tokenTo)
        return {amountFrom: amountTo, path: []}

    if (amountTo.isZero())
        return initialGetAmountsInResult

    const possiblePaths: string[][] = []

    const resultPromises: Promise<IGetAmountsInResult>[] = TOP_UNIV2_LIQUIDITY_TOKENS.map( async(token) => {
        if (token.address == tokenFrom || token.address == tokenTo)
            return initialGetAmountsInResult

        const path = [tokenFrom, token.address, tokenTo]

        if (!(await pathExists(factory, path)))
            return initialGetAmountsInResult

        try {
            const amountFrom: BigNumber = (await router02.getAmountsIn(amountTo,path))[0]
            return {path, amountFrom}
        } catch (error) {
            // console.error(error);
            return initialGetAmountsInResult
        }
    })

    let simplePathResult: IGetAmountsInResult | undefined;
    const simplePath = [tokenFrom, tokenTo]
    if (await pathExists(factory, simplePath))
        simplePathResult = {
            path: simplePath,
            amountFrom: (await router02.getAmountsIn(amountTo, simplePath))[0]
        }

    const results: IGetAmountsInResult[] = await Promise.all(resultPromises)

    let best: IGetAmountsInResult | undefined = simplePathResult

    for (const result of results){
        if (!result)
            continue
        if (result.path.length == 0)
            continue

        if (!best){
            best = result
            continue
        }

        // We want the lowest possible amount from.
        if (result.amountFrom.lt(best.amountFrom))
            best = result
    }

    if (!best)
        throw Error(`No path found to swap from ${tokenFrom} to ${tokenTo}.`)

    return best
}


export const useTopLiquidityTokens = () => {
    const [topLiquidityTokens, setTopLiquidityToken] = useState<ITopLiquidityToken[]>([])
    const contracts: Array<Contract|undefined> = [
        useContract('WETH'),
        useContract('FEI'),
        useContract('USDC'),
        useContract('USDT'),
        useContract('TRIBE'),
        useContract('UST'),
        useContract('Dai'),
        useContract('WBTC'),
    ]

    useEffectAsync(async () => {
        const symbolsPromises: Promise<ITopLiquidityToken>[] = contracts.map( async(c) => {
            if (!c) 
                return { address: '', symbol: ''}
            try {
                return {
                    address: c.address,
                    symbol: await c.symbol()
                }
            } catch (error) {
                // console.error(`${c.address}: ${error}`);
                return { address: '', symbol: ''}
            }
        })
        const _topLiquidityTokens: ITopLiquidityToken[] = (await Promise.all(symbolsPromises)).filter( x => x.address )
        setTopLiquidityToken([..._topLiquidityTokens])
    }, contracts)

    return topLiquidityTokens
}


interface ISwapService{
    getAmountsIn: GetAmountsInFunction,
}

const initialSwapService: ISwapService = { getAmountsIn: zeroFunction }

export const useSwapService = () => {

    const router02 = useContract('UniswapV2Router02')
    const factory = useContract('UniswapV2Factory')

    const topLiquidityTokens = useTopLiquidityTokens()

    const [swapService, setSwapService] = useState<ISwapService>(initialSwapService)

    useEffectAsync(async () => {

        if (!router02 || !topLiquidityTokens || !factory){
            setSwapService({...initialSwapService})
            return
        }
        
        setSwapService({
            getAmountsIn: (tokenFrom: string, tokenTo: string, amountTo: BigNumber) => 
                getAmountsIn(factory, router02, tokenFrom, tokenTo, amountTo, topLiquidityTokens)
        })

    }, [router02, topLiquidityTokens])

    return swapService

}

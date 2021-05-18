import { BigNumber } from "@ethersproject/bignumber";
import { parseEther, parseUnits } from "@ethersproject/units";
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
    amountFrom: BigNumber,
    psm: {
        buyGem: boolean,
        sellGem: boolean,
    }
}

type GetAmountsInFunction = (tokenFrom: string, tokenTo: string, amountTo: BigNumber) => Promise<IGetAmountsInResult>
export const initialGetAmountsInResult: IGetAmountsInResult = { path:[], amountFrom: ethers.constants.Zero, psm: { buyGem: false, sellGem: false } }
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

const getAmountsIn = async (
    factory: Contract, router02: Contract, tokenFrom: string, tokenTo: 
    string, amountTo: BigNumber, TOP_UNIV2_LIQUIDITY_TOKENS: ITopLiquidityToken[],
    dssPsm: Contract, Dai: Contract, USDC: Contract): Promise<IGetAmountsInResult> => {

    if (tokenFrom == tokenTo)
        return {amountFrom: amountTo, path: [], psm: { buyGem: false, sellGem: false }}

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
            return {path, amountFrom, psm: { buyGem: false, sellGem: false }}
        } catch (error) {
            // console.error(error);
            return initialGetAmountsInResult
        }
    })


    const simplePath = [tokenFrom, tokenTo]
    if (await pathExists(factory, simplePath)){

        resultPromises.push((async (): Promise<IGetAmountsInResult> => {
            try {
                return {
                    path: simplePath,
                    amountFrom: (await router02.getAmountsIn(amountTo, simplePath))[0],
                    psm: { buyGem: false, sellGem: false }
                }                    
            } catch (error) {
                return initialGetAmountsInResult
            }
        })())
        
    }

    const results: IGetAmountsInResult[] = await Promise.all(resultPromises)

    if (tokenFrom == Dai.address && tokenTo == USDC.address){

        const fee: BigNumber = await dssPsm.tout() // buy gem
        const gemDecimals: number = await USDC.decimals()
        
        // from = to + fee*to
        const amountFrom: BigNumber = amountTo.mul(parseEther('1')).div(parseUnits('1',gemDecimals))
            .add(fee.mul(amountTo).div(parseUnits('1',gemDecimals)))

        results.push({path: simplePath, amountFrom, psm: { buyGem: true, sellGem: false }})

    }else if (tokenFrom == USDC.address && tokenTo == Dai.address){

        const fee: BigNumber = await dssPsm.tin() // sell gem
        const gemDecimals: number = await USDC.decimals()
        // to = from - fee*from = (1-fee)*from => from = to/(1-fee)
        const amountFrom: BigNumber = amountTo
            .mul(parseUnits('1', gemDecimals))
            .div(parseEther('1').sub(fee))
            .add(1)
        
        const finalAmountTo = amountFrom
            .mul(parseEther('1').sub(fee))
            .div(parseUnits('1', gemDecimals))
        if (finalAmountTo.lt(amountTo))
            throw Error(`There is an error when calculating amountFrom.`);

        results.push({path: simplePath, amountFrom, psm: { buyGem: false, sellGem: true }})
    }

    let best: IGetAmountsInResult | undefined

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
    const dssPsm = useContract('DssPsm')
    const dai = useContract('Dai')
    const USDC = useContract('USDC')

    const topLiquidityTokens = useTopLiquidityTokens()

    const [swapService, setSwapService] = useState<ISwapService>(initialSwapService)

    useEffectAsync(async () => {

        if (!router02 || !topLiquidityTokens || !factory || !dssPsm || !dai || !USDC){
            setSwapService({...initialSwapService})
            return
        }
        
        setSwapService({
            getAmountsIn: (tokenFrom: string, tokenTo: string, amountTo: BigNumber) => 
                getAmountsIn(factory, router02, tokenFrom, tokenTo, amountTo, topLiquidityTokens, dssPsm, dai, USDC)
        })

    }, [router02, topLiquidityTokens, dssPsm])

    return swapService

}

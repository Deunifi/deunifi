import { BigNumber } from '@ethersproject/bignumber';
import { formatEther, formatUnits, parseUnits } from '@ethersproject/units';
import { Contract, ethers, PopulatedTransaction } from 'ethers';
import React, { useEffect, useState } from 'react';
import { useSigner } from './Connection';
import { useContract } from './Deployments';
import { TransactionResponse } from "@ethersproject/abstract-provider";
import { encodeParamsForWipeAndFree } from '../utils/format';
import { useServiceFee } from '../hooks/useServiceFee';
import { useSwapService, initialGetAmountsInResult, IGetAmountsInResult } from '../hooks/useSwapService';
import { useEffectAutoCancel } from '../hooks/useEffectAutoCancel';
import { useBlockContext } from '../contexts/BlockContext';
import { useDsProxyContext } from '../contexts/DsProxyContext';
import { useVaultInfoContext } from '../contexts/VaultInfoContext';
import { initialVaultExpectedOperation, useVaultExpectedOperationContext } from '../contexts/VaultExpectedOperationContext';
import { useVaultExpectedStatusContext } from '../contexts/VaultExpectedStatusContext';
import { ErrorMessage } from '../components/LockAndDraw'

interface Props { }

interface IWipeAndFreeParameters {

    daiToPayback: BigNumber,
    daiFromSigner: BigNumber,
    collateralToFree: BigNumber,

    collateralToUseToPayFlashLoan: BigNumber,
    daiFromTokenA: BigNumber,
    pathFromTokenAToDai: string[]
    daiFromTokenB: BigNumber,
    pathFromTokenBToDai: string[]

    slippageTolerance: BigNumber, // ratio with 6 decimals
    transactionDeadline: BigNumber, // minutes

    reciveETH: boolean,
}

const emptyWipeAndFreeParameters: IWipeAndFreeParameters = {
    daiToPayback: BigNumber.from(0),
    daiFromSigner: BigNumber.from(0),
    collateralToFree: BigNumber.from(0),

    collateralToUseToPayFlashLoan: BigNumber.from(0),
    daiFromTokenA: BigNumber.from(0),
    pathFromTokenAToDai: [],
    daiFromTokenB: BigNumber.from(0),
    pathFromTokenBToDai: [],

    slippageTolerance: parseUnits('.01',6), // ratio with 6 decimals
    transactionDeadline: BigNumber.from(120), // minutes

    reciveETH: true,

}

interface IWipeAndFreeForm {

    daiToPayback: string,
    daiFromSigner: string,
    collateralToFree: string,

    collateralToUseToPayFlashLoan: string,
    daiFromTokenA: string,
    daiFromTokenB: string,

    slippageTolerance: string, // percentage with 4 decimals
    transactionDeadline: string, // minutes

    reciveETH: boolean,
}

const emptyWipeAndFreeForm: IWipeAndFreeForm = {
    daiToPayback: '',
    daiFromSigner: '',
    collateralToFree: '',

    collateralToUseToPayFlashLoan: '',
    daiFromTokenA: '',
    daiFromTokenB: '',

    slippageTolerance: formatUnits(emptyWipeAndFreeParameters.slippageTolerance, 4),
    transactionDeadline: emptyWipeAndFreeParameters.transactionDeadline.toString(),
    reciveETH: true,
}

export const getLoanFee = async (lendingPool: Contract, amount: BigNumber): Promise<BigNumber> => 
    amount
        .mul(await lendingPool.FLASHLOAN_PREMIUM_TOTAL())
        .div(10000)

export const parseBigNumber = (text:string, decimals=18) => text ? parseUnits(text, decimals) : BigNumber.from(0)

const SLIPPAGE_TOLERANCE_UNIT = parseUnits('1', 6)

export const increaseWithTolerance = (amount: BigNumber, tolerance: BigNumber): BigNumber => {
    return amount
        .mul(SLIPPAGE_TOLERANCE_UNIT.add(tolerance))
        .div(SLIPPAGE_TOLERANCE_UNIT)
}

export const decreaseWithTolerance = (amount: BigNumber, tolerance: BigNumber): BigNumber => {
    return amount
        .mul(SLIPPAGE_TOLERANCE_UNIT)
        .div(SLIPPAGE_TOLERANCE_UNIT.add(tolerance))
}

export async function proxyExecute(
    proxy: Contract, methodInProxy: string, 
    target: Contract, methodInTarget: string, params: any[],
    overrides: { value?: BigNumber, gasLimit?: number } = {}): Promise<TransactionResponse>{

    const transaction: PopulatedTransaction = await target.populateTransaction[methodInTarget](...params)
  
    return await proxy[methodInProxy](target.address, transaction.data, overrides)
  
}

export function deadline(secondsFromNow: number): BigNumber {
    return BigNumber.from(Math.floor(Date.now()/1000)+secondsFromNow)
}

interface IErrors {
    tooMuchDai?: string,
    tooMuchCollateralToFree?: string
    notEnoughCollateralToCoverDai?: string,
    notEnoughCollateralToFree?: string,
    notEnoughDaiToCoverFlashLoanAndFees?: string,
    invalidCombinationOfDaiAmount?: string,
}

interface IExpectedResult{
    daiFromFlashLoan: BigNumber,
    usePsmForToken0: boolean,
    usePsmForToken1: boolean,
    token0AmountForDai: BigNumber,
    token1AmountForDai: BigNumber,
}

const initialExpectedResult: IExpectedResult = {
    daiFromFlashLoan: ethers.constants.Zero,
    usePsmForToken0: false,
    usePsmForToken1: false,
    token0AmountForDai: ethers.constants.Zero,
    token1AmountForDai: ethers.constants.Zero,
}

export const WipeAndFree: React.FC<Props> = ({ children }) => {

    const { vaultInfo } = useVaultInfoContext()
    const swapService = useSwapService()
    const [params, setParams] = useState<IWipeAndFreeParameters>(emptyWipeAndFreeParameters)
    const [form, setForm] = useState<IWipeAndFreeForm>(emptyWipeAndFreeForm)
    
    const [daiLoanPlusFees, setDaiLoanPlusFees] = useState<BigNumber>(BigNumber.from(0))
    const [daiLoanFees, setDaiLoanFees] = useState<BigNumber>(BigNumber.from(0))
    const [daiServiceFee, setDaiServiceFee] = useState<BigNumber>(BigNumber.from(0))
    const [errors, setErrors] = useState<IErrors>({})

    const [expectedResult, setExpectedResult] = useState<IExpectedResult>(initialExpectedResult)

    const { blocknumber } = useBlockContext()

    const [daiFromTokenAModifiedByUser, setDaiFromTokenAModifiedByUser] = useState(false)
    const [daiFromTokenBModifiedByUser, setDaiFromTokenBModifiedByUser] = useState(false)

    useEffectAutoCancel(function* (){
        if (daiFromTokenAModifiedByUser)
            daiFromTokenAChange({target: {value: form.daiFromTokenA}})
        else if (daiFromTokenBModifiedByUser)
            daiFromTokenBChange({target: {value: form.daiFromTokenB}})
    },[blocknumber])

    interface IChangeDaiFromTokenEvent {
        target: {
            value: string,
        }
    }

    const daiFromTokenAChange = (e: IChangeDaiFromTokenEvent) => {
        try {
            let value = e.target.value
            let daiFromTokenA = parseBigNumber(value)
            if (daiFromTokenA.gt(daiLoanPlusFees)){
                daiFromTokenA = daiLoanPlusFees
                value = formatEther(daiFromTokenA)
            }else if (daiFromTokenA.isNegative()){
                daiFromTokenA = BigNumber.from(0)
                value = '0'
            }
            const daiFromTokenB = daiLoanPlusFees.sub(daiFromTokenA)

            setDaiFromTokenAModifiedByUser(true)
            setDaiFromTokenBModifiedByUser(false)

            setParams({...params, daiFromTokenA, daiFromTokenB})
            setForm({...form, daiFromTokenA: value, daiFromTokenB: formatEther(daiFromTokenB)})
        } catch (error) {
            setForm({...form, daiFromTokenA: e.target.value})
        }
    }

    const daiFromTokenBChange = (e: IChangeDaiFromTokenEvent) => {
        try {
            let value = e.target.value
            let daiFromTokenB = parseBigNumber(value)
            if (daiFromTokenB.gt(daiLoanPlusFees)){
                daiFromTokenB = daiLoanPlusFees
                value = formatEther(daiFromTokenB)
            }else if (daiFromTokenB.isNegative()){
                daiFromTokenB = BigNumber.from(0)
                value = '0'
            }
            const daiFromTokenA = daiLoanPlusFees.sub(daiFromTokenB)

            setDaiFromTokenAModifiedByUser(false)
            setDaiFromTokenBModifiedByUser(true)
            setParams({...params, daiFromTokenA, daiFromTokenB})
            setForm({...form, daiFromTokenB: value, daiFromTokenA: formatEther(daiFromTokenA)})
        } catch (error) {
            setForm({...form, daiFromTokenB: e.target.value})            
        }
    }

    const router02 = useContract('UniswapV2Router02')
    const dai = useContract('Dai')
    const lendingPoolAddressesProvider = useContract('LendingPoolAddressesProvider')
    const lendingPool = useContract('LendingPool')

    const [token0MinAmountToRecieve, setToken0MinAmountToRecieve] = useState(BigNumber.from(0))
    const [token1MinAmountToRecieve, setToken1MinAmountToRecieve] = useState(BigNumber.from(0))
    const [token0ToRecieve, setToken0ToRecieve] = useState(BigNumber.from(0))
    const [token1ToRecieve, setToken1ToRecieve] = useState(BigNumber.from(0))

    const { getFeeFromGrossAmount } = useServiceFee()

    useEffectAutoCancel(function* (){

        setExpectedResult(initialExpectedResult)

        if (!lendingPoolAddressesProvider || !lendingPool)
            return
        
        const attachedLendingPool = lendingPool.attach((yield lendingPoolAddressesProvider.getLendingPool()) as string)

        const daiFromFlashLoan = params.daiToPayback.gt(params.daiFromSigner) ?
            params.daiToPayback.sub(params.daiFromSigner)
            : ethers.constants.Zero

        const lastDaiLoanFees = (yield getLoanFee(attachedLendingPool, daiFromFlashLoan)) as BigNumber
        if (!lastDaiLoanFees.eq(daiLoanFees))
            setDaiLoanFees(lastDaiLoanFees)
        
        const lastDaiLoanPlusFeesWithNoServiceFees = daiFromFlashLoan
            .add(lastDaiLoanFees)

        const lastDaiLoanPlusFees = lastDaiLoanPlusFeesWithNoServiceFees
            .add((yield getFeeFromGrossAmount(daiFromFlashLoan)) as BigNumber)
        if (!lastDaiLoanPlusFees.eq(daiLoanPlusFees))
            setDaiLoanPlusFees(lastDaiLoanPlusFees)

        const lastDaiServiceFee = lastDaiLoanPlusFees.sub(lastDaiLoanPlusFeesWithNoServiceFees)
        if (!lastDaiServiceFee.eq(daiServiceFee))
            setDaiServiceFee(lastDaiServiceFee)

        let errors: IErrors = {}

        if (params.daiFromSigner.add(daiFromFlashLoan).gt(vaultInfo.dart))
            errors.tooMuchDai = `You are using more DAI than needed. Max DAI to use ${formatEther(vaultInfo.dart)}.`

        if (params.collateralToFree.gt(vaultInfo.ink))
            errors.tooMuchCollateralToFree = `You are trying to free more collateral than available in your vault. Max collateral to free: ${formatEther(vaultInfo.ink)}`

        interface ICalculationResult {
            collateralToRemove: BigNumber, 
            token0AmountForDai: BigNumber, 
            token1AmountForDai: BigNumber, 
            pairToken0Balance: BigNumber,
            pairToken1Balance: BigNumber,
            pairTotalSupply: BigNumber,
            swapFromTokenAToDaiResult: IGetAmountsInResult,
            swapFromTokenBToDaiResult: IGetAmountsInResult
        }

        /**
         * Collateral -> TokenA, TokenB: 3) Collateral ~ TokenX / ReserveX
         * TokenA -> DAI TokenA: 1) getAmountsIn(DAI TokenA) to obtain TokenA
         * TokenB -> DAI TokenB: 2) getAmountsIn(DAI TokenB) to obtain TokenB
         */
        const {
            collateralToRemove, token0AmountForDai, token1AmountForDai, pairToken0Balance, pairToken1Balance, 
            pairTotalSupply, swapFromTokenAToDaiResult, swapFromTokenBToDaiResult
        } = (yield* (function* (){

            const { univ2Pair, token0, token1 } = vaultInfo.ilkInfo

            if (!univ2Pair || !token0 || !token1 || !dai || !router02){
                return {
                    collateralToRemove: BigNumber.from(0),
                    token0AmountForDai: BigNumber.from(0),
                    token1AmountForDai: BigNumber.from(0),
                    pairToken0Balance: BigNumber.from(0),
                    pairToken1Balance: BigNumber.from(0),
                    pairTotalSupply: BigNumber.from(0),
                    swapFromTokenAToDaiResult: initialGetAmountsInResult,
                    swapFromTokenBToDaiResult: initialGetAmountsInResult
                }
            }

            const pairTotalSupplyPromise = univ2Pair.totalSupply()
                // // TODO collateral to free removed from total supply?
                // .add(params.collateralToFree)
            
            
            let pairToken0BalancePromise = token0.contract.balanceOf(univ2Pair.address)
            let pairToken1BalancePromise = token1.contract.balanceOf(univ2Pair.address)
    
            const swapFromTokenAToDaiResultPromise = swapService.getAmountsIn(
                token0.contract.address, dai.address, params.daiFromTokenA)

            const swapFromTokenBToDaiResultPromise = swapService.getAmountsIn(
                token1.contract.address, dai.address, params.daiFromTokenB)
    
            // // TODO pairTokenBalance should be adjusted to consider more/less Token0/Token1,
            // // as a result of swap operations in case pair token0/token1 be used in swap operation.
            // // This do not apply for PSM case.
            // pairToken0Balance = pairToken0Balance.add(pairDelta(token0.contract.address, [token0.contract.address, token1.contract.address], swapFromTokenAToDaiResult))
            // pairToken0Balance = pairToken0Balance.add(pairDelta(token0.contract.address, [token0.contract.address, token1.contract.address], swapFromTokenBToDaiResult))
            // pairToken1Balance = pairToken1Balance.add(pairDelta(token1.contract.address, [token0.contract.address, token1.contract.address], swapFromTokenAToDaiResult))
            // pairToken1Balance = pairToken1Balance.add(pairDelta(token1.contract.address, [token0.contract.address, token1.contract.address], swapFromTokenBToDaiResult))

            const pairTotalSupply: BigNumber = ((yield pairTotalSupplyPromise) as BigNumber)
            let pairToken0Balance: BigNumber = (yield pairToken0BalancePromise) as BigNumber
            let pairToken1Balance: BigNumber = (yield pairToken1BalancePromise) as BigNumber
            const swapFromTokenAToDaiResult = (yield swapFromTokenAToDaiResultPromise) as IGetAmountsInResult
            const swapFromTokenBToDaiResult = (yield swapFromTokenBToDaiResultPromise) as IGetAmountsInResult

            const token0AmountForDai: BigNumber = swapFromTokenAToDaiResult.amountFrom
            params.pathFromTokenAToDai = swapFromTokenAToDaiResult.path

            const token1AmountForDai: BigNumber = swapFromTokenBToDaiResult.amountFrom
            params.pathFromTokenBToDai = swapFromTokenBToDaiResult.path


            const minLiquidityToRemoveForToken0 = token0AmountForDai
                .mul(pairTotalSupply)
                .div(pairToken0Balance)
            const minLiquidityToRemoveForToken1 = token1AmountForDai
                .mul(pairTotalSupply)
                .div(pairToken1Balance)

            const collateralToRemove = 
                minLiquidityToRemoveForToken0.gt(minLiquidityToRemoveForToken1) ?
                    minLiquidityToRemoveForToken0
                    : minLiquidityToRemoveForToken1
            
            return {
                collateralToRemove,
                token0AmountForDai, token1AmountForDai,
                pairToken0Balance, pairToken1Balance, pairTotalSupply,
                swapFromTokenAToDaiResult, swapFromTokenBToDaiResult
            }

        })()) as ICalculationResult

        const minCollateralToRemove = increaseWithTolerance(
            collateralToRemove,
            params.slippageTolerance
        )

        const token0ToRecieve = 
            pairTotalSupply.isZero() ? BigNumber.from(0) 
            : params.collateralToUseToPayFlashLoan.mul(pairToken0Balance).div(pairTotalSupply)

        setToken0ToRecieve(
            token0ToRecieve.sub(token0AmountForDai).isNegative() ? BigNumber.from(0) : token0ToRecieve.sub(token0AmountForDai)
        )
    
        const token1ToRecieve = 
            pairTotalSupply.isZero() ? BigNumber.from(0) 
            : params.collateralToUseToPayFlashLoan.mul(pairToken1Balance).div(pairTotalSupply)

        setToken1ToRecieve(
            token1ToRecieve.sub(token1AmountForDai).isNegative() ? BigNumber.from(0) : token1ToRecieve.sub(token1AmountForDai)
        )
    
        const token0MinAmountToRecieve = decreaseWithTolerance( // Introduced remove liquidity operation tolerance
                token0ToRecieve,
                params.slippageTolerance
            )
            .sub(token0AmountForDai)

        const token1MinAmountToRecieve = decreaseWithTolerance( // Introduced remove liquidity operation tolerance
                token1ToRecieve,
                params.slippageTolerance
            )
            .sub(token1AmountForDai)

        setToken0MinAmountToRecieve(
            // When it is negative means there is a wron combination of covered DAI by tokens.
            token0MinAmountToRecieve.isNegative() ? BigNumber.from(0) : token0MinAmountToRecieve
        )
        setToken1MinAmountToRecieve(
            // When it is negative means there is a wron combination of covered DAI by tokens.
            token1MinAmountToRecieve.isNegative() ? BigNumber.from(0) : token1MinAmountToRecieve
        )

        if (params.collateralToUseToPayFlashLoan.lt(minCollateralToRemove))
            if (minCollateralToRemove.lt(vaultInfo.ink))
                errors.notEnoughCollateralToCoverDai = `The amount to remove from pool it is not enough. Minimal amount is ${formatEther(minCollateralToRemove)}.`
            else
                errors.invalidCombinationOfDaiAmount = `The combination of DAI amounts exeeds the available collateral in your vault. Please try reducing the DAI covered with ${params.daiFromTokenA.gt(params.daiFromTokenB)? vaultInfo.ilkInfo.token0?.symbol : vaultInfo.ilkInfo.token1?.symbol}.`

        if (params.collateralToFree.lt(params.collateralToUseToPayFlashLoan))
            errors.notEnoughCollateralToFree = `The collateral amount to free from vault it is not enough. Minimal amount is ${formatEther(params.collateralToUseToPayFlashLoan)}.`

        if (daiLoanPlusFees.gt(params.daiFromTokenA.add(params.daiFromTokenB)))
            errors.notEnoughDaiToCoverFlashLoanAndFees = `The amount of DAI from LP tokens is not enough. Need to cover ${formatEther(daiLoanPlusFees)}.`

        setErrors(errors)

        setExpectedResult({ 
            usePsmForToken0: swapFromTokenAToDaiResult.psm.sellGem,
            usePsmForToken1: swapFromTokenBToDaiResult.psm.sellGem,
            token0AmountForDai,
            token1AmountForDai,
            daiFromFlashLoan: daiFromFlashLoan
        })

        setVaultExpectedOperation({
            collateralToLock: ethers.constants.Zero.sub(params.collateralToFree),
            daiToDraw: ethers.constants.Zero.sub(params.daiToPayback),
        })

    }, [params, blocknumber, vaultInfo])

    const { setVaultExpectedOperation } = useVaultExpectedOperationContext()

    useEffect( () => {
        setVaultExpectedOperation(initialVaultExpectedOperation)
    },[])

    const onChangeBigNumber = (e: React.ChangeEvent<HTMLInputElement>, decimals: number=18) => {
        try {
            const value = parseBigNumber(e.target.value, decimals)
            setParams({...params, [e.target.name]: value})
        } catch (error) {
            
        }
        setForm({...form, [e.target.name]: e.target.value})
    }

    const deunifi = useContract('Deunifi')
    const signer = useSigner()
    const {dsProxy} = useDsProxyContext()
    const dssProxyActions = useContract('DssProxyActions')
    const manager = useContract('DssCdpManager')
    const daiJoin = useContract('DaiJoin')
    const weth = useContract('WETH')
    const dssPsm = useContract('DssPsm')

    const doOperation = async (e: React.MouseEvent<HTMLButtonElement, MouseEvent>)=>{

        e.preventDefault()

        if (!deunifi || !signer || !dai || !lendingPoolAddressesProvider || !dsProxy || 
            !vaultInfo.ilkInfo.token0 || !vaultInfo.ilkInfo.token1 || !vaultInfo.ilkInfo.gem ||
            !vaultInfo.ilkInfo.gemJoin || !router02 || !dssProxyActions || !manager ||
            !daiJoin || !weth || !dssPsm || !vaultInfo.cdp)
            return

        const sender = await signer.getAddress()

        const gemJoinAddress = await dssPsm.gemJoin()

        const lendingPoolAddress = await lendingPoolAddressesProvider.getLendingPool()
        
        const dataForExecuteOperationCallback = encodeParamsForWipeAndFree(
                await deunifi.WIPE_AND_FREE(),
                sender, // address sender
                dai.address, // address debtToken;
                params.daiFromSigner.add(expectedResult.daiFromFlashLoan), // daiToPay
                vaultInfo.ilkInfo.token0.contract.address, // address tokenA;
                vaultInfo.ilkInfo.token1.contract.address, // address tokenB;
                vaultInfo.ilkInfo.gem.address, // address pairToken;
                params.collateralToFree, // uint collateralAmountToFree;
                params.collateralToUseToPayFlashLoan, // uint collateralAmountToUseToPayDebt;
                params.daiFromTokenA, // uint debtToCoverWithTokenA;
                params.daiFromTokenB, // uint debtToCoverWithTokenB;
                params.pathFromTokenAToDai, // address[] pathTokenAToDebtToken;
                params.pathFromTokenBToDai, // address[] pathTokenBToDebtToken;
                token0MinAmountToRecieve, // uint minTokenAToRecive;
                token1MinAmountToRecieve, // uint minTokenAToRecive;
                deadline(params.transactionDeadline.toNumber()*60),
                dsProxy.address,
                dssProxyActions.address,
                manager.address,
                vaultInfo.ilkInfo.gemJoin.address,
                daiJoin.address,
                vaultInfo.cdp,
                router02.address,
                params.reciveETH ? weth.address : ethers.constants.AddressZero,
                expectedResult.usePsmForToken0 ? vaultInfo.ilkInfo.token0.contract.address : 
                    expectedResult.usePsmForToken1 ? vaultInfo.ilkInfo.token1.contract.address :
                        ethers.constants.AddressZero,
                gemJoinAddress,
                dssPsm.address,
                expectedResult.usePsmForToken0 ? expectedResult.token0AmountForDai : 
                    expectedResult.usePsmForToken1 ? expectedResult.token1AmountForDai :
                        ethers.constants.Zero,
                expectedResult.usePsmForToken0 ? params.daiFromTokenA : 
                    expectedResult.usePsmForToken1 ? params.daiFromTokenA :
                        ethers.constants.Zero,
                lendingPoolAddress,
        )

        try{
            await proxyExecute(
                dsProxy, 'execute(address,bytes)',
                deunifi, 'flashLoanFromDSProxy',[
                    sender,
                    deunifi.address,
                    params.daiFromSigner.isZero() ? [] : [dai.address], // owner tokens to transfer to target
                    params.daiFromSigner.isZero() ? [] : [params.daiFromSigner], // owner token amounts to transfer to target
                    await lendingPoolAddressesProvider.getLendingPool(),
                    expectedResult.daiFromFlashLoan.isZero() ? [] : [dai.address], // loanTokens
                    expectedResult.daiFromFlashLoan.isZero() ? [] : [expectedResult.daiFromFlashLoan], // loanAmounts
                    [BigNumber.from(0)], //modes
                    dataForExecuteOperationCallback, // Data to be used on executeOperation
                    ethers.constants.AddressZero
                ]
            )
        } catch (error) {
            // TODO Handle error
            console.error(error)
        }

    }

    const { vaultExpectedStatus, vaultExpectedStatusErrors } = useVaultExpectedStatusContext()

    return (
        <form>
            <p>
                <label>
                    DAI to payback:
                    <input type="number" value={form.daiToPayback} name="daiToPayback" onChange={(e) => onChangeBigNumber(e)}/>
                    <button onClick={(e)=>{
                        e.preventDefault()
                        setForm({...form, daiToPayback: formatEther(vaultInfo.dart)})
                        setParams({...params, daiToPayback: vaultInfo.dart})
                    }}>Max</button>
                </label>
                <br></br>
                <label>
                    DAI From Signer:
                    <input type="number" value={form.daiFromSigner} name="daiFromSigner" onChange={(e) => onChangeBigNumber(e)}/>
                </label>
            </p>

            <p>
                {errors.tooMuchDai ? <span>{errors.tooMuchDai}<br></br></span> : ''}
                {daiLoanFees.isZero() ? '' : <span>Flash Loan Fees (0.09%): {formatEther(daiLoanFees)} DAI<br></br></span>}
                {daiServiceFee.isZero() ? '' : <span>Service Fee (0.03%): {formatEther(daiServiceFee)} DAI<br></br></span>}
                {daiLoanPlusFees.isZero() ? '' : <span>Total Dai to get from collateral: {formatEther(daiLoanPlusFees)} DAI<br></br></span>}
            </p>

            <p>
                <label>
                    DAI Covered With {vaultInfo.ilkInfo.token0?.symbol}:
                    <input type="number" value={form.daiFromTokenA} name="daiFromTokenA" onChange={ (e) => daiFromTokenAChange(e) }/>
                    <br></br>
                    [{params.pathFromTokenAToDai.join(', ')}]
                </label>
                <br></br>
                <label>
                    DAI Covered With {vaultInfo.ilkInfo.token1?.symbol}:
                    <input type="number" value={form.daiFromTokenB} name="daiFromTokenB"  onChange={ (e) => daiFromTokenBChange(e) }/>
                    <br></br>
                    [{params.pathFromTokenBToDai.join(', ')}]
                </label>
            </p>

            <p>
                {errors.notEnoughDaiToCoverFlashLoanAndFees ? <span>{errors.notEnoughDaiToCoverFlashLoanAndFees}<br></br></span> : ''}
                {errors.invalidCombinationOfDaiAmount ? <span>{errors.invalidCombinationOfDaiAmount}<br></br></span> : ''}
            </p>


            <p>
                <label>
                    {vaultInfo.ilkInfo.symbol} To Remove From Pool:
                    <input type="number" value={form.collateralToUseToPayFlashLoan} name="collateralToUseToPayFlashLoan" onChange={(e) => onChangeBigNumber(e)}/>
                    <button onClick={(e)=>{
                        e.preventDefault()
                        setForm({...form, collateralToUseToPayFlashLoan: formatUnits(vaultInfo.ink), collateralToFree: formatUnits(vaultInfo.ink)})
                        setParams({...params, collateralToUseToPayFlashLoan: vaultInfo.ink, collateralToFree: vaultInfo.ink})
                    }}>Max</button>

                    {errors.notEnoughCollateralToCoverDai? 
                        <span><br></br>{errors.notEnoughCollateralToCoverDai}</span>: ''}
                </label>

                <br></br>
                <label>
                    {vaultInfo.ilkInfo.symbol} To Free From Vault:
                    <input type="number" value={form.collateralToFree} name="collateralToFree" onChange={(e) => onChangeBigNumber(e)}/>
                    <button onClick={(e)=>{
                        e.preventDefault()
                        setForm({...form, collateralToFree: formatUnits(vaultInfo.ink)})
                        setParams({...params, collateralToFree: vaultInfo.ink})
                    }}>Max</button>
                    {errors.tooMuchCollateralToFree ? <span><br></br>{errors.tooMuchCollateralToFree}</span> : ''}
                    {errors.notEnoughCollateralToFree ? <span><br></br>{errors.notEnoughCollateralToFree}</span> : ''}

                </label>
            </p>

            <p>
                <label>
                    <input type="checkbox" checked={form.reciveETH} name="useETH" onChange={(e) => {
                            setForm({...form, reciveETH: e.target.checked })
                            setParams({...params, reciveETH: e.target.checked })
                        }} />
                    Recive ETH
                </label>
            </p>


            <p>
                <label>
                    Slippage Tolerance (%):
                    <input type="number" value={form.slippageTolerance} name="slippageTolerance" onChange={(e) => onChangeBigNumber(e,4)}/>
                </label>
                <br></br>
                <label>
                    Transaction Deadline (minutes):
                    <input type="number" value={form.transactionDeadline} name="transactionDeadline" onChange={(e) => onChangeBigNumber(e,0)}/>
                </label>
            </p>

            <p>
                <span>
                    Remaining debt: { formatEther(vaultExpectedStatus.dart) }
                    {ErrorMessage(vaultExpectedStatusErrors.debtFloor)}
                    <br></br>
                </span>
                <span>
                    Remaining collateral: { formatUnits(vaultExpectedStatus.ink, vaultInfo.ilkInfo.dec) }
                    <br></br>
                </span>
                <span>
                    New collateralization ratio: { formatEther(vaultExpectedStatus.collateralizationRatio) }
                    {ErrorMessage(vaultExpectedStatusErrors.collateralizationRatio)}
                    <br></br>
                </span>

                <br></br>
                {errors.notEnoughCollateralToCoverDai? 
                    '': 
                    <span>
                        <span>
                            Amount of {vaultInfo.ilkInfo.token0?.symbol} to recieve: 
                                {formatUnits(token0ToRecieve,vaultInfo.ilkInfo.token0?.decimals || 18)} {vaultInfo.ilkInfo.token0?.symbol} (min: 
                                    {formatUnits(token0MinAmountToRecieve,vaultInfo.ilkInfo.token0?.decimals || 18)} {vaultInfo.ilkInfo.token0?.symbol})
                                <br></br>
                        </span>
                        <span>
                            Amount of {vaultInfo.ilkInfo.token1?.symbol} to recieve: 
                                {formatUnits(token1ToRecieve,vaultInfo.ilkInfo.token1?.decimals || 18)} {vaultInfo.ilkInfo.token1?.symbol} (min: 
                                    {formatUnits(token1MinAmountToRecieve,vaultInfo.ilkInfo.token1?.decimals || 18)} {vaultInfo.ilkInfo.token1?.symbol})
                        </span>
                    </span>}

                {(errors.tooMuchCollateralToFree || errors.notEnoughCollateralToFree) ? 
                    '': 
                    <span>
                        <br></br>
                        <span>Amount of {vaultInfo.ilkInfo.symbol} to recieve: {formatUnits(params.collateralToFree.sub(params.collateralToUseToPayFlashLoan), vaultInfo.ilkInfo.dec)} {vaultInfo.ilkInfo.symbol}<br></br></span>
                    </span>}

            </p>

            <button onClick={(e) => doOperation(e)}>
                Unifi :)
            </button>
        </form>

    )

}
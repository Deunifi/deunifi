import { BigNumber } from '@ethersproject/bignumber';
import { formatEther, formatUnits, parseUnits } from '@ethersproject/units';
import { Contract, ethers, PopulatedTransaction } from 'ethers';
import React, { ChangeEvent, useEffect, useState } from 'react';
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
import BusyBackdrop, { ErrorMessage, TokenFromUserInput, getTokenSymbolForLabel, ApprovalButton, needsApproval, SummaryValue, hasErrors, apyToPercentage } from '../components/LockAndDraw'
import { useLendingPool } from '../hooks/useLendingPool';
import { useConnectionContext } from '../contexts/ConnectionContext';
import { Box, Button, ButtonBaseClassKey, Card, FormControlLabel, Grid, InputAdornment, Slider, Switch, TextField, TextFieldClassKey, Typography } from '@material-ui/core';
import { formatBigNumber, SimpleCard } from './VaultInfo';
import { useVaultContext } from '../contexts/VaultSelectionContext';
import { useBusyBackdrop } from '../hooks/useBusyBackdrop';
import { useApyContext } from '../contexts/APYContext';

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

    slippageTolerance: parseUnits('.01', 6), // ratio with 6 decimals
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
    displayAdditionalOptions: boolean,

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
    displayAdditionalOptions: false,

}

export const parseBigNumber = (text: string, decimals = 18) => text.replace(',','.') ? parseUnits(text.replace(',','.'), decimals) : BigNumber.from(0)

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
    overrides: { value?: BigNumber, gasLimit?: number } = {}): Promise<TransactionResponse> {

    const transaction: PopulatedTransaction = await target.populateTransaction[methodInTarget](...params)

    return await proxy[methodInProxy](target.address, transaction.data, overrides)

}

export function deadline(secondsFromNow: number): BigNumber {
    return BigNumber.from(Math.floor(Date.now() / 1000) + secondsFromNow)
}

interface IErrors {
    tooMuchDai?: string,
    tooMuchCollateralToFree?: string,
    tooMuchCollateralToSwap?: string,
    notEnoughCollateralToCoverDai?: string,
    notEnoughCollateralToFree?: string,
    notEnoughDaiToCoverFlashLoanAndFees?: string,
    toMuchDaiToCoverFlashLoanAndFees?: string,
    invalidCombinationOfDaiAmountCoveredWithToken0?: string,
    invalidCombinationOfDaiAmountCoveredWithToken1?: string,
    toleranceMustBeHigherThanZero?: string,
    deadlineMustBeHigherThanZero?: string,
    tooMuchDebtToPayback?: string,
    tooMuchDaiFromAccount?: string,
    notEnoughDaiInAccount?: string,
}

interface IExpectedResult {
    daiLoanPlusFees: BigNumber,
    daiLoanFees: BigNumber,
    daiServiceFee: BigNumber,
    daiFromFlashLoan: BigNumber,
    usePsmForToken0: boolean,
    usePsmForToken1: boolean,
    token0AmountForDai: BigNumber,
    token1AmountForDai: BigNumber,
    debTokenNeedsApproval: boolean,
    minCollateralToRemove: BigNumber,
    collateralAmountToRecive: BigNumber,
}

const initialExpectedResult: IExpectedResult = {
    daiLoanPlusFees: ethers.constants.Zero,
    daiLoanFees: ethers.constants.Zero,
    daiServiceFee: ethers.constants.Zero,
    daiFromFlashLoan: ethers.constants.Zero,
    usePsmForToken0: false,
    usePsmForToken1: false,
    token0AmountForDai: ethers.constants.Zero,
    token1AmountForDai: ethers.constants.Zero,
    debTokenNeedsApproval: false,
    minCollateralToRemove: ethers.constants.Zero,
    collateralAmountToRecive: ethers.constants.Zero,
}

export const WipeAndFree: React.FC<Props> = ({ children }) => {

    const { vaultInfo } = useVaultInfoContext()
    const swapService = useSwapService()

    const [params, setParams] = useState<IWipeAndFreeParameters>(emptyWipeAndFreeParameters)
    const [form, setForm] = useState<IWipeAndFreeForm>(emptyWipeAndFreeForm)
    const [errors, setErrors] = useState<IErrors>({})

    const [expectedResult, setExpectedResult] = useState<IExpectedResult>(initialExpectedResult)
    const [daiToCoverWithToken0Percent, setDaiToCoverWithToken0Percent] = useState(50)

    const { blocknumber } = useBlockContext()

    const [daiFromTokenAModifiedByUser, setDaiFromTokenAModifiedByUser] = useState(false)
    const [daiFromTokenBModifiedByUser, setDaiFromTokenBModifiedByUser] = useState(false)

    const { vault } = useVaultContext()

    const clear = () => {
        setDaiFromTokenAModifiedByUser(false)
        setDaiFromTokenBModifiedByUser(false)
        setParams(emptyWipeAndFreeParameters)
        setForm(emptyWipeAndFreeForm)
        setErrors({})
    }

    useEffect(() => {
        clear()
    }, [vault])


    // TODO remove
    // useEffectAutoCancel(function* () {
    //     if (operationInProgress)
    //         return
    //     if (daiFromTokenAModifiedByUser)
    //         daiFromTokenAChange({ target: { value: form.daiFromTokenA } })
    //     else if (daiFromTokenBModifiedByUser)
    //         daiFromTokenBChange({ target: { value: form.daiFromTokenB } })
    // }, [blocknumber])

    interface IChangeDaiFromTokenEvent {
        target: {
            value: string,
        }
    }

    const daiFromTokenAChange = (e: IChangeDaiFromTokenEvent) => {
        try {
            let value = e.target.value
            let daiFromTokenA = parseBigNumber(value)
            if (daiFromTokenA.gt(expectedResult.daiLoanPlusFees)) {
                daiFromTokenA = expectedResult.daiLoanPlusFees
                value = formatEther(daiFromTokenA)
            } else if (daiFromTokenA.isNegative()) {
                daiFromTokenA = BigNumber.from(0)
                value = '0'
            }
            const daiFromTokenB = expectedResult.daiLoanPlusFees.sub(daiFromTokenA)

            setDaiFromTokenAModifiedByUser(true)
            setDaiFromTokenBModifiedByUser(false)

            setParams({ ...params, daiFromTokenA, daiFromTokenB })
            setForm({ ...form, daiFromTokenA: value, daiFromTokenB: formatEther(daiFromTokenB) })
        } catch (error) {
            setForm({ ...form, daiFromTokenA: e.target.value })
        }
    }

    const daiFromTokenBChange = (e: IChangeDaiFromTokenEvent) => {
        try {
            let value = e.target.value
            let daiFromTokenB = parseBigNumber(value)
            if (daiFromTokenB.gt(expectedResult.daiLoanPlusFees)) {
                daiFromTokenB = expectedResult.daiLoanPlusFees
                value = formatEther(daiFromTokenB)
            } else if (daiFromTokenB.isNegative()) {
                daiFromTokenB = BigNumber.from(0)
                value = '0'
            }
            const daiFromTokenA = expectedResult.daiLoanPlusFees.sub(daiFromTokenB)

            setDaiFromTokenAModifiedByUser(false)
            setDaiFromTokenBModifiedByUser(true)
            setParams({ ...params, daiFromTokenA, daiFromTokenB })
            setForm({ ...form, daiFromTokenB: value, daiFromTokenA: formatEther(daiFromTokenA) })
        } catch (error) {
            setForm({ ...form, daiFromTokenB: e.target.value })
        }
    }

    const router02 = useContract('UniswapV2Router02')
    const dai = useContract('Dai')
    const lendingPool = useLendingPool()

    const [token0MinAmountToRecieve, setToken0MinAmountToRecieve] = useState(BigNumber.from(0))
    const [token1MinAmountToRecieve, setToken1MinAmountToRecieve] = useState(BigNumber.from(0))
    const [token0ToRecieve, setToken0ToRecieve] = useState(BigNumber.from(0))
    const [token1ToRecieve, setToken1ToRecieve] = useState(BigNumber.from(0))

    const { getFeeFromGrossAmount, serviceFeeRatio: feeRatio } = useServiceFee()

    useEffectAutoCancel(function* () {

        if (operationInProgress)
            return

        if (!lendingPool.contract || !dai || !weth){
            setExpectedResult({...initialExpectedResult})
            return
        }

        const daiBalanceOfAccountPromise = dai.balanceOf(address)

        const debTokenNeedsApprovalPromise = needsApproval(dai, address, dsProxy?.address, params.daiFromSigner, weth.address, false)

        const daiFromFlashLoan = params.daiToPayback.gt(params.daiFromSigner) ?
            params.daiToPayback.sub(params.daiFromSigner)
            : ethers.constants.Zero

        const daiLoanFees = lendingPool.getLoanFee(daiFromFlashLoan)

        const lastDaiLoanPlusFeesWithNoServiceFees = daiFromFlashLoan
            .add(daiLoanFees)

        // FIXME This should apply to daiFromFlashLoan instead of params.daiToPayback,
        // but first must be changed the Deunifi.sol contract.
        const daiServiceFee = (yield getFeeFromGrossAmount(params.daiToPayback)) as BigNumber

        const daiLoanPlusFees = lastDaiLoanPlusFeesWithNoServiceFees
            .add(daiServiceFee)

        let errors: IErrors = {}

        // if (params.daiFromSigner.add(daiFromFlashLoan).gt(vaultInfo.dart))
        //     errors.tooMuchDai = `You are using more DAI than needed. Max DAI to use ${formatEther(vaultInfo.dart)}.`
        if (params.daiFromSigner.gt(params.daiToPayback))
            errors.tooMuchDai = `You are using more DAI than needed. Max DAI to use ${formatEther(params.daiToPayback)}.`

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
        } = (yield* (function* () {

            const { univ2Pair, token0, token1 } = vaultInfo.ilkInfo

            if (!univ2Pair || !token0 || !token1 || !dai || !router02) {
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

            let swapFromTokenAToDaiResult = initialGetAmountsInResult
            try {
                swapFromTokenAToDaiResult = (yield swapFromTokenAToDaiResultPromise) as IGetAmountsInResult
            } catch (error) {
                if (!error.noSwapPathFound)
                    throw error
            }

            let swapFromTokenBToDaiResult = initialGetAmountsInResult
            try {
                swapFromTokenBToDaiResult = (yield swapFromTokenBToDaiResultPromise) as IGetAmountsInResult
            } catch (error) {
                if (!error.noSwapPathFound)
                    throw error
            }

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


        if (params.collateralToFree.lt(minCollateralToRemove) && minCollateralToRemove.lt(vaultInfo.ink))
            errors.notEnoughCollateralToFree = `The amount to free from vault it is not enough. Minimal amount is ${formatEther(minCollateralToRemove)}.`

        if (params.collateralToUseToPayFlashLoan.lt(minCollateralToRemove) && minCollateralToRemove.lt(vaultInfo.ink))
            //Minimal amount is ${formatEther(params.collateralToUseToPayFlashLoan)}
            errors.notEnoughCollateralToCoverDai = `The amount of collateral to swap it is not enough. Minimal amount is ${formatEther(minCollateralToRemove)}.`
        
        if (minCollateralToRemove.gt(vaultInfo.ink)){
            const [actionForToken0, actionForToken1] = params.daiFromTokenA.gt(params.daiFromTokenB) ? 
                ['decrease', 'increase']
                : ['increase', 'decrease']
            errors.invalidCombinationOfDaiAmountCoveredWithToken0 = `The combination of DAI amounts is not valid. Try to ${actionForToken0} the DAI covered with ${getTokenSymbolForLabel(vaultInfo.ilkInfo.token0?.symbol, params.reciveETH)}.`
            errors.invalidCombinationOfDaiAmountCoveredWithToken1 = `The combination of DAI amounts is not valid. Try to ${actionForToken1} the DAI covered with ${getTokenSymbolForLabel(vaultInfo.ilkInfo.token1?.symbol, params.reciveETH)}.`
        }

        if (params.collateralToFree.lt(params.collateralToUseToPayFlashLoan))
            errors.tooMuchCollateralToSwap = `You are trying to swap more collateral than you are freeing from your vault.`

        if (daiLoanPlusFees.gt(params.daiFromTokenA.add(params.daiFromTokenB)))
            errors.notEnoughDaiToCoverFlashLoanAndFees = `The amount of DAI covered is not enough. Need to cover ${formatEther(daiLoanPlusFees)}.`
        else if (daiLoanPlusFees.lt(params.daiFromTokenA.add(params.daiFromTokenB)))
            errors.toMuchDaiToCoverFlashLoanAndFees = `You are covering more DAI than needed. Only need to cover ${formatEther(daiLoanPlusFees)}.`

        if (params.slippageTolerance.lte(0))
            errors.toleranceMustBeHigherThanZero = 'Slippage tolerance must be higher than zero'

        if (params.transactionDeadline.lte(0))
            errors.deadlineMustBeHigherThanZero = 'Transaction deadline must be higher than zero'

        if (params.daiToPayback.gt(vaultInfo.dart))
            errors.tooMuchDebtToPayback = `You are trying to cover more debt than needed. Max debt to cover ${formatEther(vaultInfo.dart)}.`

        if (params.daiFromSigner.gt(params.daiToPayback))
            errors.tooMuchDaiFromAccount = `You using more DAI than needed. Max DAI to cover ${formatEther(params.daiToPayback)}.`

        if (params.daiFromSigner.gt((yield daiBalanceOfAccountPromise) as BigNumber))
            errors.notEnoughDaiInAccount = 'You do not have enough DAI in your account'

        setErrors(errors)

        const debTokenNeedsApproval = (yield debTokenNeedsApprovalPromise) as boolean

        const collateralAmountToRecive = params.collateralToFree.sub(params.collateralToUseToPayFlashLoan)

        setExpectedResult({
            daiLoanPlusFees,
            daiLoanFees,
            daiServiceFee,
            usePsmForToken0: swapFromTokenAToDaiResult.psm.sellGem,
            usePsmForToken1: swapFromTokenBToDaiResult.psm.sellGem,
            token0AmountForDai,
            token1AmountForDai,
            daiFromFlashLoan: daiFromFlashLoan,
            debTokenNeedsApproval: debTokenNeedsApproval,
            minCollateralToRemove,
            collateralAmountToRecive
        })

        setVaultExpectedOperation({
            collateralToLock: ethers.constants.Zero.sub(params.collateralToFree),
            daiToDraw: ethers.constants.Zero.sub(params.daiToPayback),
        })

    }, [params, blocknumber, vaultInfo])

    const { setVaultExpectedOperation } = useVaultExpectedOperationContext()

    useEffect(() => {
        setVaultExpectedOperation(initialVaultExpectedOperation)
    }, [])

    const onChangeBigNumber = (e: React.ChangeEvent<HTMLInputElement>, decimals: number = 18) => {
        try {
            const value = parseBigNumber(e.target.value, decimals)
            setParams({ ...params, [e.target.name]: value })
        } catch (error) {

        }
        setForm({ ...form, [e.target.name]: e.target.value })
    }

    const deunifi = useContract('Deunifi')
    const { signer, address } = useConnectionContext()
    const { dsProxy } = useDsProxyContext()
    const dssProxyActions = useContract('DssProxyActions')
    const manager = useContract('DssCdpManager')
    const daiJoin = useContract('DaiJoin')
    const weth = useContract('WETH')
    const dssPsm = useContract('DssPsm')

    const [operationInProgress, setOperationInProgress] = useState(false)

    const doOperation = async (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {

        e.preventDefault()

        if (!deunifi || !signer || !dai || !lendingPool.contract || !dsProxy ||
            !vaultInfo.ilkInfo.token0 || !vaultInfo.ilkInfo.token1 || !vaultInfo.ilkInfo.gem ||
            !vaultInfo.ilkInfo.gemJoin || !router02 || !dssProxyActions || !manager ||
            !daiJoin || !weth || !dssPsm || !vaultInfo.cdp)
            return

        const sender = await signer.getAddress()

        const gemJoinAddress = await dssPsm.gemJoin()

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
            deadline(params.transactionDeadline.toNumber() * 60),
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
            lendingPool.contract.address,
        )

        try {
            setOperationInProgress(true)
            const transactionResponse = await proxyExecute(
                dsProxy, 'execute(address,bytes)',
                deunifi, 'flashLoanFromDSProxy', [
                sender,
                deunifi.address,
                params.daiFromSigner.isZero() ? [] : [dai.address], // owner tokens to transfer to target
                params.daiFromSigner.isZero() ? [] : [params.daiFromSigner], // owner token amounts to transfer to target
                lendingPool.contract.address,
                expectedResult.daiFromFlashLoan.isZero() ? [] : [dai.address], // loanTokens
                expectedResult.daiFromFlashLoan.isZero() ? [] : [expectedResult.daiFromFlashLoan], // loanAmounts
                [BigNumber.from(0)], //modes
                dataForExecuteOperationCallback, // Data to be used on executeOperation
                ethers.constants.AddressZero
            ]
            )
            await transactionResponse.wait(1)
            clear()
        } catch (error) {
            // TODO Handle error
            console.error(error)
        } finally{
            setOperationInProgress(false)
        }

    }

    const { vaultExpectedStatus, vaultExpectedStatusErrors } = useVaultExpectedStatusContext()
    const { apy } = useApyContext()
    
    const { backdrop: secondaryOperationInProgressBackdrop, setInProgress: setSecondaryOperationInProgress } = useBusyBackdrop({ color: "secondary"})

    return (
        <Grid container spacing={2} alignItems="flex-start" direction="row" justify="space-evenly">
            <Grid item xs={6}>
                <SimpleCard>

                    <Typography color="textSecondary" gutterBottom>
                        Transaction Parameters
                        </Typography>

                    <Box m={1}>

                        <TextFieldWithOneButton
                            textField={
                                <TextField
                                    fullWidth
                                    size="small"
                                    margin="normal"
                                    variant="outlined"
                                    required
                                    label='Debt to payback'
                                    // type="number"
                                    value={form.daiToPayback} name="daiToPayback" 
                                    onChange={(e) => {
                                        onChangeBigNumber(e as ChangeEvent<HTMLInputElement>)
                                    }}
                                    error={errors.tooMuchDebtToPayback ? true : false}
                                    helperText={ errors.tooMuchDebtToPayback || 'Amount of DAI debt to payback' }
                                    InputProps={{
                                        endAdornment: <InputAdornment position="end">DAI</InputAdornment>,
                                    }}
                                />
                            }
                            button={
                                <Button
                                    fullWidth
                                    // variant="outlined"
                                    color="secondary"
                                    onClick={(e) => {
                                        e.preventDefault()
                                        setForm({ ...form, daiToPayback: formatEther(vaultInfo.dart) })
                                        setParams({ ...params, daiToPayback: vaultInfo.dart })
                                    }}>
                                    Max
                                </Button>
                            }
                        ></TextFieldWithOneButton>

                        <TextFieldWithOneButton
                            textField={
                                <TextField
                                    fullWidth
                                    size="small"
                                    margin="normal"
                                    variant="outlined"
                                    label='DAI From Your Account'
                                    // type="number"
                                    value={form.daiFromSigner} name="daiFromSigner" onChange={(e) => onChangeBigNumber(e as ChangeEvent<HTMLInputElement>)}
                                    error={errors.tooMuchDai || errors.notEnoughDaiInAccount ? true : false}
                                    helperText={errors.tooMuchDai || errors.notEnoughDaiInAccount || 'Amount of DAI to use from your account'}
                                    InputProps={{
                                        endAdornment: <InputAdornment position="end">DAI</InputAdornment>,
                                    }}
                                />
                            }
                            button={
                                <Button
                                    fullWidth
                                    // variant="outlined"
                                    color="secondary"
                                    onClick={async (e) => {
                                        e.preventDefault()
                                        if (!dai)
                                            return
                                        const balance: BigNumber = await dai.balanceOf(address)
                                        const max = params.daiToPayback.gt(balance) ? balance : params.daiToPayback
                                        setForm({ ...form, daiFromSigner: formatEther(max) })
                                        setParams({ ...params, daiFromSigner: max })
                                    }}>
                                    Max
                                </Button>
                            }
                        ></TextFieldWithOneButton>
                        <ApprovalButton
                            needsApproval={expectedResult.debTokenNeedsApproval}
                            dsProxy={dsProxy}
                            signer={signer}
                            token={{ symbol: 'DAI', contract: dai }}
                            setApprovalInProgress={setSecondaryOperationInProgress}
                            >
                        </ApprovalButton>
                        {secondaryOperationInProgressBackdrop}

                        {/* <Slider 

                            onChange={(e, value) => {
                                setDaiToCoverWithToken0Percent(value as number)
                            }}
                            onChangeCommitted={(e, value) => {
                                const daiToCoverWithToken0 = expectedResult.daiLoanPlusFees.mul(value).div(10000)
                                daiFromTokenAChange({
                                    target: {
                                        value: formatEther(daiToCoverWithToken0)
                                    }
                                } as ChangeEvent<HTMLInputElement>)
                            }}
                            value={daiToCoverWithToken0Percent}
                            min={0} 
                            max={10000}  
                            getAriaValueText={value => `${value/100}% ${vaultInfo.ilkInfo.token0?.symbol}/${(10000-value)/100}% ${vaultInfo.ilkInfo.token1?.symbol}`}
                            marks={[
                                {
                                  value: 500,
                                  label: vaultInfo.ilkInfo.token0?.symbol,
                                },
                                {
                                  value: 5000,
                                  label: `50% ${vaultInfo.ilkInfo.token0?.symbol}/50% ${vaultInfo.ilkInfo.token1?.symbol}`,
                                },
                                {
                                  value: 9500,
                                  label: vaultInfo.ilkInfo.token1?.symbol,
                                },
                              ]}
                            /> */}


                        <Card variant="outlined">

                            <Box p={2}>
                                <Typography color="textSecondary" gutterBottom>
                                    Distribution to cover debt+fees
                                </Typography>

                                <Grid container>
                                    {[0, 50, 100].map( token0Percentage => (
                                        <Grid item xs={4}>
                                            <Button
                                                fullWidth
                                                color="secondary"
                                                onClick={() => {
                                                    const daiToCoverWithToken0 = expectedResult.daiLoanPlusFees.mul(token0Percentage).div(100)
                                                    daiFromTokenAChange({
                                                        target: {
                                                            value: formatEther(daiToCoverWithToken0)
                                                        }
                                                    } as ChangeEvent<HTMLInputElement>)
                                                }}
                                            >{token0Percentage}%/{100-token0Percentage}%</Button>
                                        </Grid>
                                    ))}
                                </Grid>

                                <TextField
                                    fullWidth
                                    size="small"
                                    margin="normal"
                                    variant="outlined"
                                    required
                                    label={`Debt+fees covered with ${getTokenSymbolForLabel(vaultInfo.ilkInfo.token0?.symbol, params.reciveETH)}`}
                                    // type="number"
                                    value={form.daiFromTokenA} name="daiFromTokenA" onChange={(e) => daiFromTokenAChange(e)}
                                    error={errors.notEnoughDaiToCoverFlashLoanAndFees || errors.invalidCombinationOfDaiAmountCoveredWithToken0 || errors.toMuchDaiToCoverFlashLoanAndFees ? true : false}
                                    helperText={
                                        errors.notEnoughDaiToCoverFlashLoanAndFees 
                                        || errors.invalidCombinationOfDaiAmountCoveredWithToken0
                                        || errors.toMuchDaiToCoverFlashLoanAndFees
                                        || `Amount of ${getTokenSymbolForLabel(vaultInfo.ilkInfo.token0?.symbol, params.reciveETH)} to use to cover debt + fees in DAI.`
                                    }
                                    InputProps={{
                                        endAdornment: <InputAdornment position="end">DAI</InputAdornment>,
                                    }}
                                />
                                {/* [{params.pathFromTokenAToDai.join(', ')}] */}

                                <TextField
                                    fullWidth
                                    size="small"
                                    margin="normal"
                                    variant="outlined"
                                    required
                                    label={`Debt+fees covered with ${getTokenSymbolForLabel(vaultInfo.ilkInfo.token1?.symbol, params.reciveETH)}`}
                                    // type="number"
                                    value={form.daiFromTokenB} name="daiFromTokenB" onChange={(e) => daiFromTokenBChange(e)}
                                    error={errors.notEnoughDaiToCoverFlashLoanAndFees || errors.invalidCombinationOfDaiAmountCoveredWithToken1 || errors.toMuchDaiToCoverFlashLoanAndFees ? true : false}
                                    helperText={
                                        errors.notEnoughDaiToCoverFlashLoanAndFees
                                        || errors.invalidCombinationOfDaiAmountCoveredWithToken1
                                        || errors.toMuchDaiToCoverFlashLoanAndFees
                                        || `Amount of ${getTokenSymbolForLabel(vaultInfo.ilkInfo.token1?.symbol, params.reciveETH)} to use to cover debt + fees in DAI.`
                                    }
                                    InputProps={{
                                        endAdornment: <InputAdornment position="end">DAI</InputAdornment>,
                                    }}
                                />
                                {/* [{params.pathFromTokenBToDai.join(', ')}] */}

                            </Box>
                            
                        </Card>
                        
                        <Box mt={2}>
                            <TextFieldWithOneButton
                                textField={
                                    <TextField
                                        fullWidth
                                        size="small"
                                        margin="normal"
                                        variant="outlined"
                                        required
                                        label={`Collateral to free`}
                                        // type="number"
                                        value={form.collateralToFree} name="collateralToFree" onChange={(e) => onChangeBigNumber(e as ChangeEvent<HTMLInputElement>)}
                                        error={errors.tooMuchCollateralToFree || errors.notEnoughCollateralToFree ? true : false}
                                        helperText={
                                            errors.tooMuchCollateralToFree 
                                            || errors.notEnoughCollateralToFree 
                                            || `Amount of ${vaultInfo.ilkInfo.symbol} to use from your vault`
                                        }
                                        InputProps={{
                                            endAdornment: <InputAdornment position="end">{vaultInfo.ilkInfo.symbol}</InputAdornment>,
                                        }}
                                    />
                                }
                                button={
                                    <Box>
                                        <Button
                                            fullWidth
                                            // variant="outlined"
                                            color="secondary"
                                            onClick={(e) => {
                                                e.preventDefault()
                                                setForm({ ...form, collateralToFree: formatUnits(expectedResult.minCollateralToRemove) })
                                                setParams({ ...params, collateralToFree: expectedResult.minCollateralToRemove })
                                            }}>
                                            Min
                                        </Button>
                                        <Button
                                            fullWidth
                                            // variant="outlined"
                                            color="secondary"
                                            onClick={(e) => {
                                                e.preventDefault()
                                                setForm({ ...form, collateralToFree: formatUnits(vaultInfo.ink) })
                                                setParams({ ...params, collateralToFree: vaultInfo.ink })
                                            }}>
                                            Max
                                        </Button>
                                    </Box>
                                }
                            ></TextFieldWithOneButton>
                        </Box>

                        <TextFieldWithOneButton
                            textField={
                                <TextField
                                    fullWidth
                                    size="small"
                                    margin="normal"
                                    variant="outlined"
                                    required
                                    label={`Collateral to swap`}
                                    // type="number"
                                    value={form.collateralToUseToPayFlashLoan} name="collateralToUseToPayFlashLoan" onChange={(e) => onChangeBigNumber(e as ChangeEvent<HTMLInputElement>)}
                                    error={errors.notEnoughCollateralToCoverDai || errors.tooMuchCollateralToSwap ? true : false}
                                    helperText={
                                        errors.notEnoughCollateralToCoverDai
                                        || errors.tooMuchCollateralToSwap
                                        || `Amount of ${vaultInfo.ilkInfo.symbol} to swap to ${getTokenSymbolForLabel(vaultInfo.ilkInfo.token0?.symbol, params.reciveETH)} and ${getTokenSymbolForLabel(vaultInfo.ilkInfo.token1?.symbol, params.reciveETH)}`
                                    }
                                    InputProps={{
                                        endAdornment: <InputAdornment position="end">{vaultInfo.ilkInfo.symbol}</InputAdornment>,
                                    }}
                                />
                            }
                            button={
                                <Box>
                                    <Button
                                        fullWidth
                                        // variant="outlined"
                                        color="secondary"
                                        onClick={(e) => {
                                            e.preventDefault()
                                            setForm({ ...form, collateralToUseToPayFlashLoan: formatUnits(expectedResult.minCollateralToRemove)})
                                            setParams({ ...params, collateralToUseToPayFlashLoan: expectedResult.minCollateralToRemove })
                                        }}>
                                        Min
                                    </Button>
                                    <Button
                                        fullWidth
                                        // variant="outlined"
                                        color="secondary"
                                        onClick={(e) => {
                                            e.preventDefault()
                                            const max = params.collateralToFree.lt(vaultInfo.ink) ? params.collateralToFree : vaultInfo.ink
                                            setForm({ ...form, collateralToUseToPayFlashLoan: formatUnits(max)})
                                            setParams({ ...params, collateralToUseToPayFlashLoan: max })
                                        }}>
                                        Max
                                    </Button>
                                </Box>
                            }
                        ></TextFieldWithOneButton>

                        <Box mb={3}>
                            <FormControlLabel
                                control={
                                <Switch
                                    size="medium"
                                    checked={form.displayAdditionalOptions}
                                    onChange={(e) => setForm({ ...form, displayAdditionalOptions: e.target.checked })}
                                    name="additionalOptions"
                                    color="primary"
                                />
                                }
                                label="Display additional options"
                                labelPlacement="end"
                            />
                        </Box>


                        <Card hidden={!form.displayAdditionalOptions} variant="outlined">

                            <Box p={2}>

                                <Typography color="textSecondary" gutterBottom>
                                    Additional options
                                </Typography>

                                <Box
                                    p={1}
                                    hidden={vaultInfo.ilkInfo.token0?.symbol != 'WETH' && vaultInfo.ilkInfo.token1?.symbol != 'WETH'}
                                    >
                                    <FormControlLabel
                                        control={
                                        <Switch
                                            size="medium"
                                            checked={form.reciveETH}
                                            onChange={(e) => {
                                                setForm({ ...form, reciveETH: e.target.checked })
                                                setParams({ ...params, reciveETH: e.target.checked })
                                            }}
                                            name="reciveETH"
                                            color="secondary"
                                        />
                                        }
                                        label="Recive ETH"
                                        // labelPlacement="bottom"
                                    />
                                </Box>

                                <TextField 
                                        fullWidth
                                        required
                                        size="small"
                                        margin="normal"
                                        variant="outlined"
                                        label='Slippage Tolerance (%)'
                                        // type="number" 
                                        value={form.slippageTolerance} name="slippageTolerance" onChange={(e) => onChangeBigNumber(e as ChangeEvent<HTMLInputElement>, 4)}
                                        error={errors?.toleranceMustBeHigherThanZero ? true : false }
                                        helperText={ errors?.toleranceMustBeHigherThanZero || "If transaction conditions are modified beyond tolerance, then the transaction will be rejected." }
                                        InputProps={{
                                            endAdornment: <InputAdornment position="end">%</InputAdornment>,
                                        }}
                                        />

                                <TextField 
                                        fullWidth
                                        required
                                        size="small"
                                        margin="normal"
                                        variant="outlined"
                                        label='Transaction Deadline (minutes)'
                                        // type="number" 
                                        value={form.transactionDeadline} name="transactionDeadline" onChange={(e) => onChangeBigNumber(e as ChangeEvent<HTMLInputElement>, 0)}
                                        error={errors?.deadlineMustBeHigherThanZero ? true : false }
                                        helperText={ errors?.deadlineMustBeHigherThanZero || "If transaction is not confirmed before deadline, then the transaction will be rejected." }
                                        InputProps={{
                                            endAdornment: <InputAdornment position="end">min.</InputAdornment>,
                                        }}
                                        />

                                </Box>
                        </Card>
                        
                    </Box>

                </SimpleCard>
            </Grid>
                <Grid item xs={6}>
                    <SimpleCard>

                        <Typography color="textSecondary" gutterBottom>
                            Transaction Summary
                        </Typography>
                        
                        <Box m={1}>
                            <Card variant="outlined">
                                <SummaryValue
                                    label={`Flash Loan Fees (${formatUnits(lendingPool.loanFeeRatio, 2)}%)`}
                                    value={formatEther(expectedResult.daiLoanFees)}
                                    units='DAI'
                                    />

                                <SummaryValue
                                    label={`Deunifi Service Fee (${formatUnits(feeRatio, 2)}%)`}
                                    value={formatEther(expectedResult.daiServiceFee)}
                                    units='DAI'
                                    />

                                {/* <SummaryValue
                                    label='Total Dai to get from collateral'
                                    value={formatEther(daiLoanPlusFees)}
                                    units='DAI'
                                    /> */}
                            </Card>
                        </Box>

                        <Box m={1}>
                            <Card variant="outlined">
                                <SummaryValue
                                    label='Remaining collateral'
                                    value={formatUnits(vaultExpectedStatus.ink, vaultInfo.ilkInfo.dec)}
                                    units={vaultInfo.ilkInfo.symbol}
                                    />

                                <SummaryValue
                                    label='Remaining debt'
                                    value={formatEther(vaultExpectedStatus.dart)}
                                    units='DAI'
                                    errors={[ErrorMessage(vaultExpectedStatusErrors.debtFloor), ]}
                                    />

                            </Card>
                        </Box>

                        <Box m={1}>
                            <Card variant="outlined">

                                <SummaryValue
                                    label='New collateralization ratio'
                                    value={formatEther(vaultExpectedStatus.collateralizationRatio.mul(100))}
                                    units='%'
                                    errors={[ErrorMessage(vaultExpectedStatusErrors.collateralizationRatio), ]}
                                    />

                                <SummaryValue 
                                    label="New Liquidation Price"
                                    value={formatBigNumber(vaultExpectedStatus.liquidationPrice, 27)}
                                    units="USD"
                                    />

                                <SummaryValue 
                                    label="Expected Vault's APY"
                                    value={apyToPercentage(apy.vaultExpectedApy)}
                                    units="%"
                                    // comments={[`Estimation based on information of last ${apy.calculationDaysQuantity} day(s) obtained from Uniswap's Analytics.`,]}
                                    />

                            </Card>
                        </Box>

                        <Box m={1}>
                            <Card variant="outlined">
                                <SummaryValue
                                    label={`Amount of ${getTokenSymbolForLabel(vaultInfo.ilkInfo.token0?.symbol, params.reciveETH)} to recieve`}
                                    value={formatUnits(token0ToRecieve, vaultInfo.ilkInfo.token0?.decimals || 18)}
                                    units={getTokenSymbolForLabel(vaultInfo.ilkInfo.token0?.symbol, params.reciveETH)}
                                    comments={[`Min: ${formatUnits(token0MinAmountToRecieve, vaultInfo.ilkInfo.token0?.decimals || 18)} ${getTokenSymbolForLabel(vaultInfo.ilkInfo.token0?.symbol, params.reciveETH)}`]}
                                    />

                                <SummaryValue
                                    label={`Amount of ${getTokenSymbolForLabel(vaultInfo.ilkInfo.token1?.symbol, params.reciveETH)} to recieve`}
                                    value={formatUnits(token1ToRecieve, vaultInfo.ilkInfo.token1?.decimals || 18)}
                                    units={getTokenSymbolForLabel(vaultInfo.ilkInfo.token1?.symbol, params.reciveETH)}
                                    comments={[`Min: ${formatUnits(token1MinAmountToRecieve, vaultInfo.ilkInfo.token1?.decimals || 18)} ${getTokenSymbolForLabel(vaultInfo.ilkInfo.token1?.symbol, params.reciveETH)}`]}
                                    />

                                <SummaryValue
                                    label={`Amount of ${vaultInfo.ilkInfo.symbol} to recieve`}
                                    value={formatUnits(
                                        expectedResult.collateralAmountToRecive.isNegative() ?
                                            ethers.constants.Zero : expectedResult.collateralAmountToRecive,
                                        vaultInfo.ilkInfo.dec)}
                                    units={vaultInfo.ilkInfo.symbol}
                                    />
                            </Card>
                        </Box>
                        

                        <Button 
                            disabled={
                                hasErrors(errors) 
                                || hasErrors(vaultExpectedStatusErrors)
                                || expectedResult.debTokenNeedsApproval
                                || ( vaultInfo.ink.eq(vaultExpectedStatus.ink) && vaultInfo.dart.eq(vaultExpectedStatus.dart) )
                            }
                            fullWidth
                            variant="contained"
                            color="primary"
                            onClick={(e) => doOperation(e)}>
                            Wipe And Free
                        </Button>

                    </SimpleCard>
                </Grid>
                <BusyBackdrop open={operationInProgress}></BusyBackdrop>
            </Grid>


    )

}


export const TextFieldWithOneButton: React.FC<{ textField: any, button: any}> = ({ textField, button }) => {
    return (
        <Grid container>
            <Grid xs={9}>
                {textField}
            </Grid>
            <Grid xs={3}>
                <Box p={2}>
                    {button}
                </Box>
            </Grid>
        </Grid>
    )
}


import { BigNumber } from "@ethersproject/bignumber";
import { formatEther, formatUnits, parseUnits } from "@ethersproject/units";
import { Backdrop, Box, Button, Card, CircularProgress, CircularProgressProps, createStyles, FormControlLabel, Grid, InputAdornment, LinearProgress, makeStyles, Switch, TextField, Theme, Tooltip, Typography } from "@material-ui/core";
import { Contract, ethers } from "ethers";
import React, { ChangeEvent, useEffect, useState } from "react";
import { useServiceFee } from "../hooks/useServiceFee";
import { useSwapService, IGetAmountsInResult, initialGetAmountsInResult } from "../hooks/useSwapService";
import { encodeParamsForLockGemAndDraw } from "../utils/format";
import { useForm, defaultSideEffect, IChangeBigNumberEvent, IForm } from "../utils/forms";
import { useContract } from "./Deployments";
import { decreaseWithTolerance, proxyExecute, deadline, TextFieldWithOneButton } from "./WipeAndFree";
import { useEffectAutoCancel } from "../hooks/useEffectAutoCancel";
import { useBlockContext } from "../contexts/BlockContext";
import { useDsProxyContext } from "../contexts/DsProxyContext";
import { useVaultInfoContext, ONE_RAY } from "../contexts/VaultInfoContext";
import { initialVaultExpectedOperation, useVaultExpectedOperationContext } from "../contexts/VaultExpectedOperationContext";
import { useVaultExpectedStatusContext } from "../contexts/VaultExpectedStatusContext";
import { formatBigNumber, SimpleCard } from "./VaultInfo";
import { useApyContext } from "../contexts/APYContext";
import { useLendingPool } from "../hooks/useLendingPool";
import { useConnectionContext } from "../contexts/ConnectionContext";
import { useVaultContext } from "../contexts/VaultSelectionContext";
import { useSnackbarContext } from "../contexts/SnackbarContext";
import withWidth, { WithWidth } from '@material-ui/core/withWidth';


interface Props { }

interface IFormFields {

    tokenAToLock: any,
    tokenAFromSigner: any,

    tokenBToLock: any,
    tokenBFromSigner: any,

    daiFromSigner: any,
    collateralFromUser: any,

    slippageTolerance: any, // ratio with 6 decimals
    transactionDeadline: any, // minutes

    useETH: any,
}

interface IFormErrors {

    daiFromSigner: string,
    collateralFromUser: string,

    tokenAToLock: string,
    tokenAFromSigner: string,

    tokenBToLock: string,
    tokenBFromSigner: string,

    slippageTolerance: string, // ratio with 6 decimals
    transactionDeadline: string, // minutes

    useETH: string,

    toleranceMustBeHigherThanZero: string,
    deadlineMustBeHigherThanZero: string,
    tooMuchDaiFromAccount: string,

    swapPathNotFoundForToken0: string,
    swapPathNotFoundForToken1: string,
}

const emptyFormErrors: IFormErrors = {
    daiFromSigner: '',
    collateralFromUser: '',

    tokenAToLock: '',
    tokenAFromSigner: '',

    tokenBToLock: '',
    tokenBFromSigner: '',

    slippageTolerance: '',
    transactionDeadline: '',

    useETH: '',

    toleranceMustBeHigherThanZero: '',
    deadlineMustBeHigherThanZero: '',

    tooMuchDaiFromAccount: '',

    swapPathNotFoundForToken0: '',
    swapPathNotFoundForToken1: '',
}

interface IClenedForm extends IFormFields {

    daiFromSigner: BigNumber,
    collateralFromUser: BigNumber,

    tokenAToLock: BigNumber,
    tokenAFromSigner: BigNumber,

    tokenBToLock: BigNumber,
    tokenBFromSigner: BigNumber,

    slippageTolerance: BigNumber, // ratio with 6 decimals
    transactionDeadline: BigNumber, // minutes

    useETH: boolean,

    displayAdditionalOptions: boolean,

}

const emptyClenedForm: IClenedForm = {

    daiFromSigner: BigNumber.from(0),
    collateralFromUser: ethers.constants.Zero,

    tokenAToLock: BigNumber.from(0),
    tokenAFromSigner: BigNumber.from(0),

    tokenBToLock: BigNumber.from(0),
    tokenBFromSigner: BigNumber.from(0),

    slippageTolerance: parseUnits('.01', 6), // ratio with 6 decimals
    transactionDeadline: BigNumber.from(120), // minutes

    useETH: true,

    displayAdditionalOptions: false,
}

interface ITextForm extends IFormFields {

    daiFromSigner: string,
    collateralFromUser: string,

    tokenAFromSigner: string,
    tokenBFromSigner: string,

    slippageTolerance: string, // percentage with 4 decimals
    transactionDeadline: string, // minutes

    useETH: boolean,
}

const emptyTextForm: ITextForm = {
    daiFromSigner: '',
    collateralFromUser: '',

    tokenAToLock: '',
    tokenAFromSigner: '',

    tokenBToLock: '',
    tokenBFromSigner: '',

    slippageTolerance: formatUnits(emptyClenedForm.slippageTolerance, 4),
    transactionDeadline: emptyClenedForm.transactionDeadline.toString(),

    useETH: true,
}

interface IExpectedResult {
    
    daiForTokenA: BigNumber,
    tokenAToBuyWithDai: BigNumber,
    pathFromDaiToTokenA: string[]
    usePsmForTokenA: boolean,

    daiForTokenB: BigNumber,
    tokenBToBuyWithDai: BigNumber,
    pathFromDaiToTokenB: string[]
    usePsmForTokenB: boolean,
    daiFromFlashLoan: BigNumber,

    daiToDraw: BigNumber,

    collateralToBuy: BigNumber,
    minCollateralToBuy: BigNumber,
    collateralToLock: BigNumber,
    minCollateralToLock: BigNumber,

    needsGemApproval: boolean,
    needsToken0Approval: boolean,
    needsToken1Approval: boolean,
    needsDebtTokenApproval: boolean,

    collateralToLockInUSD: BigNumber,

    daiLoanFees: BigNumber,
    daiServiceFee: BigNumber,
}

const emptyExpectedResult: IExpectedResult = {

    daiForTokenA: ethers.constants.Zero,
    tokenAToBuyWithDai: ethers.constants.Zero,
    pathFromDaiToTokenA: [],
    usePsmForTokenA: false,

    daiForTokenB: ethers.constants.Zero,
    tokenBToBuyWithDai: ethers.constants.Zero,
    pathFromDaiToTokenB: [],
    usePsmForTokenB: false,

    daiFromFlashLoan: ethers.constants.Zero,

    daiToDraw: ethers.constants.Zero,

    collateralToBuy: ethers.constants.Zero,
    minCollateralToBuy: ethers.constants.Zero,
    collateralToLock: ethers.constants.Zero,
    minCollateralToLock: ethers.constants.Zero,

    needsGemApproval: false,
    needsToken0Approval: false,
    needsToken1Approval: false,
    needsDebtTokenApproval: false,

    collateralToLockInUSD: ethers.constants.Zero,

    daiLoanFees: ethers.constants.Zero,
    daiServiceFee: ethers.constants.Zero,
}

export const pairDelta = (token: string, [token0, token1]: string[], inSwapResult: IGetAmountsInResult): BigNumber => {
    if (inSwapResult.psm.buyGem || inSwapResult.psm.sellGem)
        return ethers.constants.Zero
    for (let i=0; i<inSwapResult.path.length-1; i++){
        if ((inSwapResult.path[i]==token0 && inSwapResult.path[i+1]==token1) ||
            (inSwapResult.path[i]==token1 && inSwapResult.path[i+1]==token0)){
            
            // Adding token to the pair...
            if (inSwapResult.path[i]==token)
                return inSwapResult.pathAmounts[i]
            // Removing token from the pair...
            else
                return inSwapResult.pathAmounts[i+1].mul(-1)
        }
    }
    return ethers.constants.Zero
}

export const needsApproval = async (token: Contract, owner: string, spender: string|undefined, amount: BigNumber, weth: string, useEth: boolean): Promise<boolean> => {
    if (amount.isZero())
        return false
    if (token.address == weth && useEth)
        return false
    if (!spender)
        return true
    const allowance: BigNumber = await token.allowance(owner, spender)
    return allowance.lt(amount);
}

export const LockAndDraw = () => {

    const { vault, ilkChanged } = useVaultContext()

    const { vaultInfo } = useVaultInfoContext()
    const dai = useContract('Dai')
    const { signer, address, chainId } = useConnectionContext()

    const form = useForm<ITextForm, IClenedForm, IFormErrors>(emptyTextForm, emptyClenedForm)
    const [expectedResult, setExpectedResult] = useState<IExpectedResult>(emptyExpectedResult)

    const router02 = useContract('UniswapV2Router02')
    const swapService = useSwapService()

    const { getGrossAmountFromNetAmount, serviceFeeRatio: feeRatio } = useServiceFee()


    const lendingPool = useLendingPool()

    const { blocknumber } = useBlockContext()

    useEffect(() => {
        if (ilkChanged){
            setTokenAToLockModifiedByUser(false)
            setTokenBToLockModifiedByUser(false)
            form.clear()
        }
    }, [vault, ilkChanged])

    useEffectAutoCancel(function* () {

        if (operationInProgress)
            return

        if (!dai || !vaultInfo.ilkInfo.token0 || !vaultInfo.ilkInfo.token1 || !router02
            || !vaultInfo.ilkInfo.univ2Pair || !weth || !vaultInfo.ilkInfo.gem || !lendingPool.contract) {
            form.setErrors(undefined)
            return
        }

        setUpdateInProgress(true)

        const token0 = vaultInfo.ilkInfo.token0.contract
        const token1 = vaultInfo.ilkInfo.token1.contract

        const signerAddress = address

        const errors: IFormErrors = { ...emptyFormErrors }

        const gemBalanceOfSigner = (yield vaultInfo.ilkInfo.gem.balanceOf(signerAddress)) as BigNumber
        if (gemBalanceOfSigner.lt(form.cleanedValues.collateralFromUser))
            errors.collateralFromUser = `You do not have enough ${vaultInfo.ilkInfo.symbol} in your balance.`

        const daiBalanceOfSigner = (yield dai.balanceOf(signerAddress)) as BigNumber
        if (daiBalanceOfSigner.lt(form.cleanedValues.daiFromSigner))
            errors.daiFromSigner = "You do not have enough DAI in your balance."

        const token0BalanceOfSigner = signer ?
            (
                (token0.address == weth.address && form.cleanedValues.useETH) ?
                yield signer.getBalance()
                : yield token0.balanceOf(signerAddress)
            ) as BigNumber
            : ethers.constants.Zero

        if (token0BalanceOfSigner.lt(form.cleanedValues.tokenAFromSigner))
            errors.tokenAFromSigner = `You do not have enough ${getTokenSymbolForLabel(vaultInfo.ilkInfo.token0.symbol, form.cleanedValues.useETH)} in your balance.`

        const token1BalanceOfSigner =  signer ?
            (
                (token1.address == weth.address && form.cleanedValues.useETH) ?
                yield signer.getBalance()
                : yield token1.balanceOf(signerAddress)
            ) as BigNumber
            : ethers.constants.Zero

        if (token1BalanceOfSigner.lt(form.cleanedValues.tokenBFromSigner))
            errors.tokenBFromSigner = `You do not have enough ${getTokenSymbolForLabel(vaultInfo.ilkInfo.token1.symbol, form.cleanedValues.useETH)} in your balance.`

        const expectedResult = { ...emptyExpectedResult }

        if (form.cleanedValues.tokenAFromSigner.gt(form.cleanedValues.tokenAToLock)){
            errors.tokenAFromSigner = `${getTokenSymbolForLabel(vaultInfo.ilkInfo.token0.symbol, form.cleanedValues.useETH)} from your account could not be higher than ${getTokenSymbolForLabel(vaultInfo.ilkInfo.token0.symbol, form.cleanedValues.useETH)} to lock.`
            expectedResult.tokenAToBuyWithDai = ethers.constants.Zero
        }else{
            expectedResult.tokenAToBuyWithDai = form.cleanedValues.tokenAToLock.sub(form.cleanedValues.tokenAFromSigner)
        }

        let tokenAFromResult = initialGetAmountsInResult
        try{
            tokenAFromResult = (yield swapService.getAmountsIn(
                dai.address, token0.address, expectedResult.tokenAToBuyWithDai)) as IGetAmountsInResult
        } catch (e){
            if (e.noSwapPathFound)
                errors.swapPathNotFoundForToken0 = `Not possible to swap from DAI to ${getTokenSymbolForLabel(vaultInfo.ilkInfo.token1.symbol, form.cleanedValues.useETH)} for this amount`
            else
                throw e
        }
        expectedResult.daiForTokenA = tokenAFromResult.amountFrom
        expectedResult.pathFromDaiToTokenA = tokenAFromResult.path
        expectedResult.usePsmForTokenA = tokenAFromResult.psm.buyGem    


        if (form.cleanedValues.tokenBFromSigner.gt(form.cleanedValues.tokenBToLock)){
            errors.tokenBFromSigner = `${getTokenSymbolForLabel(vaultInfo.ilkInfo.token1.symbol, form.cleanedValues.useETH)} from your account could not be higher than ${getTokenSymbolForLabel(vaultInfo.ilkInfo.token1.symbol, form.cleanedValues.useETH)} to lock.`
            expectedResult.tokenBToBuyWithDai = ethers.constants.Zero
        }else{
            expectedResult.tokenBToBuyWithDai = form.cleanedValues.tokenBToLock.sub(form.cleanedValues.tokenBFromSigner)
        }

        let tokenBFromResult = initialGetAmountsInResult
        try{
            tokenBFromResult = (yield swapService.getAmountsIn(
                dai.address, token1.address, expectedResult.tokenBToBuyWithDai)) as IGetAmountsInResult
        } catch (e){
            if (e.noSwapPathFound)
                errors.swapPathNotFoundForToken1 = `Not possible to swap from DAI to ${getTokenSymbolForLabel(vaultInfo.ilkInfo.token1.symbol, form.cleanedValues.useETH)} for this amount`
            else
                throw e
        }
        expectedResult.daiForTokenB = tokenBFromResult.amountFrom
        expectedResult.pathFromDaiToTokenB = tokenBFromResult.path
        expectedResult.usePsmForTokenB = tokenBFromResult.psm.buyGem

        expectedResult.daiFromFlashLoan = expectedResult.daiForTokenA
            .add(expectedResult.daiForTokenB)
            .sub(form.cleanedValues.daiFromSigner)

        expectedResult.daiLoanFees = lendingPool.getLoanFee(expectedResult.daiFromFlashLoan)
        const daiToDrawWithoutServiceFee = expectedResult.daiFromFlashLoan
            .add(expectedResult.daiLoanFees)

        // Flash loan plus fees.
        expectedResult.daiToDraw = (yield getGrossAmountFromNetAmount(daiToDrawWithoutServiceFee)) as BigNumber
        expectedResult.daiServiceFee = expectedResult.daiToDraw.sub(daiToDrawWithoutServiceFee)

        const { univ2Pair } = vaultInfo.ilkInfo

        const pairTotalSupply: BigNumber = (yield univ2Pair.totalSupply()) as BigNumber
        // const pairToken0Balance: BigNumber = await token0.balanceOf(univ2Pair.address)
        // const pairToken1Balance: BigNumber = await token1.balanceOf(univ2Pair.address)
        const reserves = (yield vaultInfo.ilkInfo.univ2Pair.getReserves()) as BigNumber[]
        let [pairToken0Balance, pairToken1Balance]: BigNumber[] = reserves

        // TODO pairTokenBalance should be adjusted to consider more/less Token0/Token1,
        // as a result of swap operations in case pair token0/token1 be used in swap operation.
        // This do not apply for PSM case.
        pairToken0Balance = pairToken0Balance.add(pairDelta(token0.address, [token0.address, token1.address], tokenAFromResult))
        pairToken0Balance = pairToken0Balance.add(pairDelta(token0.address, [token0.address, token1.address], tokenBFromResult))
        pairToken1Balance = pairToken1Balance.add(pairDelta(token1.address, [token0.address, token1.address], tokenAFromResult))
        pairToken1Balance = pairToken1Balance.add(pairDelta(token1.address, [token0.address, token1.address], tokenBFromResult))

        const liquidityUsingToken0 = form.cleanedValues.tokenAToLock
            .mul(pairTotalSupply)
            .div(pairToken0Balance)
        const liquidityUsingToken1 = form.cleanedValues.tokenBToLock
            .mul(pairTotalSupply)
            .div(pairToken1Balance)

        expectedResult.collateralToBuy =
            liquidityUsingToken0.lt(liquidityUsingToken1) ?
                liquidityUsingToken0 :
                liquidityUsingToken1

        expectedResult.minCollateralToBuy = decreaseWithTolerance(
            expectedResult.collateralToBuy,
            form.cleanedValues.slippageTolerance
        )

        expectedResult.collateralToLock = expectedResult.collateralToBuy
            .add(form.cleanedValues.collateralFromUser)

        expectedResult.minCollateralToLock = expectedResult.minCollateralToBuy
            .add(form.cleanedValues.collateralFromUser);

        [
            expectedResult.needsGemApproval,
            expectedResult.needsToken0Approval,
            expectedResult.needsToken1Approval,
            expectedResult.needsDebtTokenApproval

        ] = (yield Promise.all([
            needsApproval(vaultInfo.ilkInfo.gem, signerAddress, dsProxy?.address, form.cleanedValues.collateralFromUser, weth.address, form.cleanedValues.useETH),
            needsApproval(vaultInfo.ilkInfo.token0.contract, signerAddress, dsProxy?.address, form.cleanedValues.tokenAFromSigner, weth.address, form.cleanedValues.useETH),
            needsApproval(vaultInfo.ilkInfo.token1.contract, signerAddress, dsProxy?.address, form.cleanedValues.tokenBFromSigner, weth.address, form.cleanedValues.useETH),
            needsApproval(dai, signerAddress, dsProxy?.address, form.cleanedValues.daiFromSigner, weth.address, form.cleanedValues.useETH),
        ])) as boolean[]

        expectedResult.collateralToLockInUSD = expectedResult.collateralToLock.mul(vaultInfo.price).div(ONE_RAY)

        if (form.cleanedValues.slippageTolerance.lte(0))
            errors.toleranceMustBeHigherThanZero = 'Slippage tolerance must be higher than zero'

        if (form.cleanedValues.transactionDeadline.lte(0))
            errors.deadlineMustBeHigherThanZero = 'Transaction deadline must be higher than zero'

        if (form.cleanedValues.daiFromSigner.gt(
            expectedResult.daiForTokenA.add(expectedResult.daiForTokenB)))
            errors.tooMuchDaiFromAccount = `You are using more DAI than needed. Max DAI to use ${formatEther(
                expectedResult.daiForTokenA.add(expectedResult.daiForTokenB)
            )}`

        setExpectedResult(expectedResult)
        setVaultExpectedOperation(expectedResult)
        form.setErrors(errors)

        setUpdateInProgress(false)

    }, [form.cleanedValues, signer, dai, vaultInfo, router02, blocknumber])

    const { setVaultExpectedOperation } = useVaultExpectedOperationContext()

    useEffect( () => {
        setVaultExpectedOperation(initialVaultExpectedOperation)
    },[])

    const [tokenAToLockModifiedByUser, setTokenAToLockModifiedByUser] = useState(false)
    const [tokenBToLockModifiedByUser, setTokenBToLockModifiedByUser] = useState(false)

    useEffectAutoCancel(function* (){
        if (operationInProgress)
            return
        if (tokenAToLockModifiedByUser)
            tokenAToLockChange({target: {name: 'tokenAToLock', value: form.textValues.tokenAToLock}})
        else if (tokenBToLockModifiedByUser)
            tokenBToLockChange({target: {name: 'tokenBToLock', value: form.textValues.tokenBToLock}})
    },[blocknumber])

    const daiFromSignerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        form.onChangeBigNumber(e)
    }

    const tokenAToLockChange = (e: IChangeBigNumberEvent) => {

        const sideEffect = async (fieldname: string, textValue: string, cleanedValue: BigNumber) => {

            if (!vaultInfo.ilkInfo.univ2Pair || !vaultInfo.ilkInfo.token1)
                return defaultSideEffect(fieldname, textValue, cleanedValue)

            setUpdateInProgress(true)

            const tokenAToLock = cleanedValue

            setTokenAToLockModifiedByUser(true)
            setTokenBToLockModifiedByUser(false)

            const reserves = await vaultInfo.ilkInfo.univ2Pair.getReserves()
            const [reserve0, reserve1]: BigNumber[] = reserves
            const tokenBToLock = tokenAToLock
                .mul(reserve1).div(reserve0)

            setUpdateInProgress(false)

            return {
                cleanedValues: {
                    ...form.cleanedValues,
                    tokenAToLock,
                    tokenBToLock,
                },
                textValues: {
                    ...form.textValues,
                    tokenAToLock: textValue,
                    tokenBToLock: formatUnits(tokenBToLock, vaultInfo.ilkInfo.token1.decimals)
                }
            }

        }

        form.onChangeBigNumber(e, vaultInfo.ilkInfo.token0?.decimals, sideEffect)
    }

    const tokenBToLockChange = (e: IChangeBigNumberEvent) => {

        const sideEffect = async (fieldname: string, textValue: string, cleanedValue: BigNumber) => {

            if (!vaultInfo.ilkInfo.univ2Pair || !vaultInfo.ilkInfo.token0)
                return defaultSideEffect(fieldname, textValue, cleanedValue)

            setUpdateInProgress(true)

            const tokenBToLock = cleanedValue

            setTokenAToLockModifiedByUser(false)
            setTokenBToLockModifiedByUser(true)

            const reserves = await vaultInfo.ilkInfo.univ2Pair.getReserves()
            const [reserve0, reserve1]: BigNumber[] = reserves
            const tokenAToLock = tokenBToLock
                .mul(reserve0).div(reserve1)

            setUpdateInProgress(false)

            return {
                cleanedValues: {
                    ...form.cleanedValues,
                    tokenAToLock,
                    tokenBToLock,
                },
                textValues: {
                    ...form.textValues,
                    tokenAToLock: formatUnits(tokenAToLock, vaultInfo.ilkInfo.token0.decimals),
                    tokenBToLock: textValue,
                }
            }

        }

        form.onChangeBigNumber(e, vaultInfo.ilkInfo.token1?.decimals, sideEffect)
    }

    const tokenAFromSignerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        form.onChangeBigNumber(e, vaultInfo.ilkInfo.token0?.decimals)
    }

    const tokenBFromSignerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        form.onChangeBigNumber(e, vaultInfo.ilkInfo.token1?.decimals)
    }

    const deunifi = useContract('Deunifi');
    const { dsProxy } = useDsProxyContext()
    const dssProxyActions = useContract('DssProxyActions')
    const manager = useContract('DssCdpManager')
    const daiJoin = useContract('DaiJoin')
    const jug = useContract('Jug')
    const weth = useContract('WETH')
    const dssPsm = useContract('DssPsm')

    const snackbar = useSnackbarContext()

    const doOperation = async (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {

        e.preventDefault()

        if (!deunifi || !signer || !dai || !lendingPool.contract || !dsProxy ||
            !vaultInfo.ilkInfo.token0 || !vaultInfo.ilkInfo.token1 || !vaultInfo.ilkInfo.gem ||
            !vaultInfo.ilkInfo.gemJoin || !router02 || !dssProxyActions || !manager ||
            !daiJoin || !vaultInfo.ilkInfo.univ2Pair || !jug || !weth || !dssPsm || !vaultInfo.cdp)
            return

        const sender = address

        const operation: BigNumber = await deunifi.LOCK_AND_DRAW()

        // const operation = BigNumber.from(2)
        const dataForExecuteOperationCallback = encodeParamsForLockGemAndDraw(
            operation, // operation: BigNumber,
            sender, // sender: string,
            dai.address, // debtToken: string,
            router02.address, // router02: string,
            dssPsm.address, // psm: string,
            vaultInfo.ilkInfo.token0.contract.address, // token0: string,
            expectedResult.daiForTokenA, // debtTokenForToken0: BigNumber,
            expectedResult.tokenAToBuyWithDai,
            expectedResult.pathFromDaiToTokenA, // pathFromDebtTokenToToken0: string[],
            expectedResult.usePsmForTokenA, // usePsmForToken0: boolean,
            vaultInfo.ilkInfo.token1.contract.address, // token1: string,
            expectedResult.daiForTokenB, // debtTokenForToken1: BigNumber,
            expectedResult.tokenBToBuyWithDai,
            expectedResult.pathFromDaiToTokenB, // pathFromDebtTokenToToken1: string[],
            expectedResult.usePsmForTokenB, // usePsmForToken1: boolean,
            form.cleanedValues.tokenAFromSigner, // token0FromUser: BigNumber,
            form.cleanedValues.tokenBFromSigner, // token1FromUser: BigNumber,
            expectedResult.minCollateralToLock.sub(form.cleanedValues.collateralFromUser), // minCollateralToBuy: BigNumber,
            form.cleanedValues.collateralFromUser, // collateralFromUser: BigNumber,
            vaultInfo.ilkInfo.univ2Pair.address, // gemToken: string,
            dsProxy.address, // dsProxy: string,
            dssProxyActions.address, // dsProxyActions: string,
            manager.address, // manager: string,
            jug.address, // jug: string,
            vaultInfo.ilkInfo.gemJoin.address, // gemJoin: string,
            daiJoin.address, // daiJoin: string,
            vaultInfo.cdp, // cdp: BigNumber,
            expectedResult.daiToDraw, // debtTokenToDraw: BigNumber,
            true, // transferFrom: boolean,
            deadline(form.cleanedValues.transactionDeadline.toNumber() * 60), // deadline: BigNumber,
            lendingPool.contract.address,
        )

        const ethToUse = form.cleanedValues.useETH ? 
        ( vaultInfo.ilkInfo.token0.contract.address == weth.address ?
            form.cleanedValues.tokenAFromSigner
            : ( vaultInfo.ilkInfo.token1.contract.address == weth.address ?
                form.cleanedValues.tokenBFromSigner
                    : ethers.constants.Zero ) )
        : ethers.constants.Zero

        const ownerTokens: string[] = []
        const ownerTokensAmounts: BigNumber[] = []

        const toTransfer : [string, BigNumber][] = [ 
            [vaultInfo.ilkInfo.token0.contract.address, form.cleanedValues.tokenAFromSigner],
            [vaultInfo.ilkInfo.token1.contract.address, form.cleanedValues.tokenBFromSigner],
            [vaultInfo.ilkInfo.univ2Pair.address, form.cleanedValues.collateralFromUser],
            [dai.address, form.cleanedValues.daiFromSigner],
        ]

        for (const [token, amount] of toTransfer){
            if (amount.isZero())
                continue
            if (form.cleanedValues.useETH && token == weth.address)
                continue
            ownerTokens.push(token)
            ownerTokensAmounts.push(amount)
        }

        const getGasLimit = (chainId: number): number|undefined => {
            // In kovan happens an out of gas exception because the amount of gas estimated by metamask is wrong.
            return chainId == 42 ? 1500000 : undefined
        }

        const gasLimit = getGasLimit(chainId)

        try {
            setOperationInProgress(true)
            const transactionResponse = await proxyExecute(
                dsProxy, 'execute(address,bytes)',
                deunifi, 'flashLoanFromDSProxy', [
                    sender,
                    deunifi.address,
                    ownerTokens, // owner tokens to transfer to target
                    ownerTokensAmounts, // owner token amounts to transfer to target
                    lendingPool.contract.address,
                    expectedResult.daiFromFlashLoan.isZero() ? [] : [dai.address], // loanTokens
                    expectedResult.daiFromFlashLoan.isZero() ? [] : [expectedResult.daiFromFlashLoan], // loanAmounts
                    [BigNumber.from(0)], //modes
                    dataForExecuteOperationCallback, // Data to be used on executeOperation
                    weth.address
                ],
                ethToUse.isZero() ? { gasLimit } : {value: ethToUse, gasLimit }
            )
            snackbar.transactionInProgress(transactionResponse)
            await transactionResponse.wait(1)
            snackbar.transactionConfirmed(transactionResponse)
            form.clear()
        } catch (error) {
            // TODO Handle error
            console.error(error)
        }finally{
            setOperationInProgress(false)
        }


    }

    const { vaultExpectedStatus, vaultExpectedStatusErrors } = useVaultExpectedStatusContext()
    const { apy } = useApyContext()

    const [operationInProgress, setOperationInProgress] = useState(false)
    const [updateInProgress, setUpdateInProgress] = useState(false)
    const [secondaryOperationInProgress, setSecondaryOperationInProgress] = useState(false)

    return (
        <div>
            {/* <Grid container spacing={1} alignItems="stretch" direction={width == 'xs' || width == 'sm'? 'column' : 'row' } justify="center"> */}
            <LinearProgress value={updateInProgress ? undefined : 100} variant={updateInProgress ? 'indeterminate' : 'determinate'}/>
            <TransactionGridContainer>
                <Grid item sm={6} xs={12}>
                    <SimpleCard>

                        <Typography color="textSecondary" gutterBottom >
                            Transaction Parameters
                        </Typography>

                        <Box m={1} >

                            <TokenFromUserInput 
                                useETH={false}
                                amount={form.textValues.collateralFromUser}
                                name="collateralFromUser"
                                onChange={(e) => form.onChangeBigNumber(e as ChangeEvent<HTMLInputElement>)}
                                errorMessage={form.errors?.collateralFromUser}

                                needsApproval={expectedResult.needsGemApproval}
                                dsProxy={dsProxy}
                                signer={signer}
                                token={{symbol: vaultInfo.ilkInfo.symbol, contract: vaultInfo.ilkInfo.gem, decimals: vaultInfo.ilkInfo.dec.toNumber()}} 

                                owner={address}
                                form={form as IForm}
                                setApprovalInProgress={setSecondaryOperationInProgress}
                                />
                            
                            <Card variant="outlined"><Box m={1} p={1} >
                                
                                    <TextField 
                                        fullWidth
                                        size="small"
                                        margin="normal"
                                        variant="outlined"
                                        label={`${getTokenSymbolForLabel(vaultInfo.ilkInfo.token0?.symbol, form.cleanedValues.useETH)} To Lock`}
                                        value={form.textValues.tokenAToLock} name="tokenAToLock" onChange={(e) => tokenAToLockChange(e)}
                                        error={form.errors?.tokenAToLock || form.errors?.swapPathNotFoundForToken0 ? true : false }
                                        helperText={
                                            form.errors?.tokenAToLock
                                            || form.errors?.swapPathNotFoundForToken0
                                            || `The ${getTokenSymbolForLabel(vaultInfo.ilkInfo.token0?.symbol, form.cleanedValues.useETH)} amount to lock in your vault.` }
                                        InputProps={{
                                            endAdornment: <InputAdornment position="end">{getTokenSymbolForLabel(vaultInfo.ilkInfo.token0?.symbol, form.cleanedValues.useETH)}</InputAdornment>,
                                        }}
                                        />

                                    <TokenFromUserInput 
                                        useETH={form.textValues.useETH}
                                        amount={form.textValues.tokenAFromSigner}
                                        name="tokenAFromSigner"
                                        onChange={(e) => tokenAFromSignerChange(e as ChangeEvent<HTMLInputElement>)}
                                        errorMessage={form.errors?.tokenAFromSigner}

                                        needsApproval={expectedResult.needsToken0Approval}
                                        dsProxy={dsProxy}
                                        signer={signer}
                                        token={vaultInfo.ilkInfo.token0}

                                        owner={address}
                                        form={form as IForm}
                                        setApprovalInProgress={setSecondaryOperationInProgress}
                                    />
                                    
                                    {/* <Box>
                                        {expectedResult.pathFromDaiToTokenA.map(address => (<Chip label={address} />))}
                                        {expectedResult.usePsmForTokenA ? 'usePsm' : ''}
                                    </Box> */}
                                
                            </Box></Card>

                            <Box mt={1}><Card variant="outlined"><Box m={1} p={1}>
                                
                                    <TextField 
                                        fullWidth
                                        size="small"
                                        margin="normal"
                                        variant="outlined"
                                        label={`${getTokenSymbolForLabel(vaultInfo.ilkInfo.token1?.symbol, form.cleanedValues.useETH)} To Lock`}  
                                        value={form.textValues.tokenBToLock}
                                        name="tokenBToLock" onChange={(e) => tokenBToLockChange(e)}
                                        error={form.errors?.tokenBToLock || form.errors?.swapPathNotFoundForToken1 ? true : false }
                                        helperText={
                                            form.errors?.tokenBToLock 
                                            || form.errors?.swapPathNotFoundForToken1
                                            || `The ${getTokenSymbolForLabel(vaultInfo.ilkInfo.token1?.symbol, form.cleanedValues.useETH)} amount to lock in your vault.` }
                                        InputProps={{
                                            endAdornment: <InputAdornment position="end">{getTokenSymbolForLabel(vaultInfo.ilkInfo.token1?.symbol, form.cleanedValues.useETH)}</InputAdornment>,
                                        }}
                                        />

                                    <TokenFromUserInput 
                                        useETH={form.textValues.useETH}
                                        amount={form.textValues.tokenBFromSigner}
                                        name="tokenBFromSigner"
                                        onChange={(e) => tokenBFromSignerChange(e as ChangeEvent<HTMLInputElement>)}
                                        errorMessage={form.errors?.tokenBFromSigner}

                                        needsApproval={expectedResult.needsToken1Approval}
                                        dsProxy={dsProxy}
                                        signer={signer}
                                        token={vaultInfo.ilkInfo.token1} 

                                        owner={address}
                                        form={form as IForm}
                                        setApprovalInProgress={setSecondaryOperationInProgress}
                                    />

                                    {/* <Box>
                                        {expectedResult.pathFromDaiToTokenB.map(address => (<Chip label={address} />))}
                                        {expectedResult.usePsmForTokenB ? 'usePsm' : ''}
                                    </Box> */}

                                
                            </Box></Card></Box>

                        

                            <FormControlLabel
                                control={
                                <Switch
                                    size="medium"
                                    checked={form.cleanedValues.displayAdditionalOptions}
                                    onChange={(e) => form.setCleanedValues({...form.cleanedValues, displayAdditionalOptions: e.target.checked })}
                                    name="additionalOptions"
                                    color="primary"
                                />
                                }
                                label="Display additional options"
                                labelPlacement="end"
                            />

                            <Card hidden={!form.cleanedValues.displayAdditionalOptions} variant="outlined">

                                <Box p={2}>

                                <Typography color="textSecondary" gutterBottom>
                                    Additional options
                                </Typography>

                                <Box
                                    m={2}
                                    hidden={!(vaultInfo.ilkInfo.token0?.symbol === 'WETH' || vaultInfo.ilkInfo.token1?.symbol === 'WETH')}
                                    >
                                    <FormControlLabel
                                        control={
                                        <Switch
                                            size="medium"
                                            checked={form.cleanedValues.useETH}
                                            onChange={(e) => {
                                                form.setTextValues({...form.textValues, useETH: e.target.checked })
                                                form.setCleanedValues({...form.cleanedValues, useETH: e.target.checked })
                                            }}
                                            name="useETH"
                                            color="secondary"
                                        />
                                        }
                                        label="Use ETH"
                                        labelPlacement="end"
                                    />
                                </Box>

                                <span hidden={dai?.address==vaultInfo.ilkInfo.token0?.contract.address || dai?.address==vaultInfo.ilkInfo.token1?.contract.address}>
                                    <TokenFromUserInput 
                                        useETH={false}
                                        amount={form.textValues.daiFromSigner}
                                        name="daiFromSigner"
                                        onChange={(e) => daiFromSignerChange(e as ChangeEvent<HTMLInputElement>)}
                                        errorMessage={form.errors?.daiFromSigner || form.errors?.tooMuchDaiFromAccount}

                                        needsApproval={expectedResult.needsDebtTokenApproval}
                                        dsProxy={dsProxy}
                                        signer={signer}
                                        token={{symbol: 'DAI', contract: dai, decimals: 18}} 

                                        owner={address}
                                        form={form as IForm}
                                        setApprovalInProgress={setSecondaryOperationInProgress}
                                        />

                                </span>

                                <TextField 
                                        required
                                        fullWidth
                                        size="small"
                                        margin="normal"
                                        variant="outlined"
                                        label='Slippage Tolerance (%)'
                                        value={form.textValues.slippageTolerance} name="slippageTolerance" onChange={(e) => form.onChangeBigNumber(e, 4)}
                                        error={form.errors?.toleranceMustBeHigherThanZero ? true : false }
                                        helperText={ form.errors?.toleranceMustBeHigherThanZero || "If transaction conditions are modified beyond tolerance, then the transaction will be rejected." }
                                        InputProps={{
                                            endAdornment: <InputAdornment position="end">%</InputAdornment>,
                                        }}
                                        />
                                
                                <TextField 
                                        required
                                        fullWidth
                                        size="small"
                                        margin="normal"
                                        variant="outlined"
                                        label='Transaction Deadline (minutes)'
                                        value={form.textValues.transactionDeadline} name="transactionDeadline" onChange={(e) => form.onChangeBigNumber(e, 0)}
                                        error={form.errors?.deadlineMustBeHigherThanZero ? true : false }
                                        helperText={ form.errors?.deadlineMustBeHigherThanZero || "If transaction is not confirmed before deadline, then the transaction will be rejected." }
                                        InputProps={{
                                            endAdornment: <InputAdornment position="end">min.</InputAdornment>,
                                        }}
                                        />

                                    </Box>
                            </Card>

                        </Box>

                    </SimpleCard>
                </Grid>
                <Grid item sm={6} xs={12}>
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
                                    
                                {/* <SummaryValue 
                                    label='DAI From Flash Loan'
                                    value={formatEther(expectedResult.daiFromFlashLoan)}
                                    /> */}

                                <SummaryValue 
                                    label='Collateral to lock'
                                    value={formatEther(expectedResult.collateralToLock)}
                                    units={vaultInfo.ilkInfo.symbol}
                                    comments={[
                                        `~ ${formatEther(expectedResult.collateralToLockInUSD)} USD`, 
                                        `Min.: ${formatEther(expectedResult.minCollateralToLock)} ${vaultInfo.ilkInfo.symbol}`
                                    ]}
                                    />

                                <SummaryValue 
                                    label='Dai to Draw'
                                    value={formatEther(expectedResult.daiToDraw)}
                                    units="DAI"
                                    errors={[ErrorMessage(vaultExpectedStatusErrors.debtCeiling), ErrorMessage(vaultExpectedStatusErrors.debtFloor)]}
                                    />
                            </Card>
                        </Box>

                        <Box m={1}>
                            <Card variant="outlined">
                                <SummaryValue 
                                    label='Expected Collateralization Ratio'
                                    value={formatEther(vaultExpectedStatus.collateralizationRatio.mul(100))}
                                    units="%"
                                    comments={vaultExpectedStatus.minCollateralizationRatio? [`Min.: ${formatEther(vaultExpectedStatus.minCollateralizationRatio.mul(100))} %`] : []}
                                    errors={[ErrorMessage(vaultExpectedStatusErrors.collateralizationRatio), ]}
                                    />

                                <SummaryValue 
                                    label='Expected Liquidation Price'
                                    units="USD"
                                    value={formatBigNumber(vaultExpectedStatus.liquidationPrice, 27)}
                                    comments={ vaultExpectedStatus.maxLiquidationPrice? [`max.: ${formatBigNumber(vaultExpectedStatus.maxLiquidationPrice, 27)} USD`, ] : [] }
                                    />

                                <SummaryValue 
                                    label="Expected Vault's APY"
                                    value={apyToPercentage(apy.vaultExpectedApy)}
                                    units="%"
                                    // comments={[`Estimation based on information of last ${apy.calculationDaysQuantity} day(s) obtained from Uniswap's Analytics.`,]}
                                    />
                            </Card>
                        </Box>

                        <Button 
                            disabled={
                                !dsProxy
                                || hasErrors(form.errors) 
                                || hasErrors(vaultExpectedStatusErrors)
                                || expectedResult.needsDebtTokenApproval
                                || expectedResult.needsGemApproval
                                || expectedResult.needsToken0Approval
                                || expectedResult.needsToken1Approval
                                || expectedResult.collateralToLock.lte(0)
                                || !vaultInfo.cdp
                                || vaultInfo.cdp.isZero()
                            }
                            fullWidth
                            variant="contained" 
                            color="primary"
                            onClick={(e) => doOperation(e)}>
                            {!dsProxy ? 
                                'Create Your Proxy' : 
                                !vaultInfo.cdp || vaultInfo.cdp.isZero() ?
                                    'Create Your Vault' :
                                        expectedResult.needsDebtTokenApproval
                                        || expectedResult.needsGemApproval
                                        || expectedResult.needsToken0Approval
                                        || expectedResult.needsToken1Approval ?
                                            'Approve Required Tokens' :
                                            hasErrors(form.errors) || hasErrors(vaultExpectedStatusErrors) ?
                                                'Verify Errors' :
                                                'Lock And Draw'}
                        </Button>
                    </SimpleCard>
                </Grid>

            </TransactionGridContainer>
            <BusyBackdrop open={operationInProgress}></BusyBackdrop>
            <BusyBackdrop open={secondaryOperationInProgress} color="secondary"></BusyBackdrop>
        </div>
    )

}

export const hasErrors = (errors: object|undefined): boolean => {
    if (!errors)
        return false
    for (const k in errors){
        if ((errors as any)[k])
            return true
    }
    return false
}

export const SummaryValue: React.FC<{ 
    label: string, value: string|number, comments?: string[], errors?: JSX.Element[], units?: string
    }> = ({ label, value, comments=[], errors=[], units }) => {
    return (
        <Box m={2}>
            <Typography variant="caption" component="p" color="textSecondary">
                {label}:
            </Typography>
            <Box>
                <Typography variant="body1" component="body" color="textPrimary" style={{display: 'inline-block'}}>
                    {value} <Typography variant="body2" component="body" color="textSecondary" hidden={units? false: true} style={{display: 'inline-block'}}>
                        {units} 
                    </Typography>
                </Typography>
            </Box>
            {comments
                // .filter(x => (x ? true : false))
                .map( comment => 
                    <Typography hidden={comment==undefined} variant="caption" component="p" color="textSecondary">
                        ({comment})
                    </Typography>
                )}
            
            {errors}
        </Box>
    )
}

export const ErrorMessage = function(message:string|undefined){
    if (!message)
        return (<span></span>)
    return (
        <span>
            <Typography variant="body2" color='error'>
                {message}
            </Typography>
        </span>
    )
}

export const ApprovalButton: React.FC<{
    needsApproval: boolean,
    token?: {symbol: string, contract: Contract|undefined},
    signer?: ethers.providers.JsonRpcSigner,
    dsProxy?: Contract,
    setApprovalInProgress?: (inProgress: boolean) => void,
    error: boolean
    }> = ({ needsApproval, token, signer, dsProxy, setApprovalInProgress=()=>{}, error }) => {

    const snackbar = useSnackbarContext()

    if (!needsApproval || !token || !(token.contract))
        return (<span></span>)

    return (
        <Tooltip title={`To use ${token?.symbol}, your proxy needs your approval.`}>
            <Box pb={2}>
                <Button
                    disabled={dsProxy && !error ? false : true}
                    fullWidth
                    color="secondary" 
                    variant="outlined" 
                    size="small"
                    onClick={async (e)=>{
                        e.preventDefault()
                        if (!token || !signer || !dsProxy)
                            return
                        try {
                            setApprovalInProgress(true)
                            const transactionResponse = await (token.contract as Contract)
                                .connect(signer)
                                .approve(dsProxy.address, ethers.constants.MaxUint256)
                            snackbar.transactionInProgress(transactionResponse)
                            await transactionResponse.wait(1)
                            snackbar.transactionConfirmed(transactionResponse)
                        } catch (error) {
                            console.error(error)
                        } finally {
                            setApprovalInProgress(false)
                        }
                    }}>
                    Approve {token?.symbol}
                </Button>
            </Box>
        </Tooltip>
    )
}

export const getTokenSymbolForLabel = (symbol:string|undefined, useEth:boolean) => useEth && symbol == 'WETH' ? 'ETH' : symbol

export const TokenFromUserInput: React.FC<{
    useETH: boolean,
    name: string,
    amount: string,
    onChange: (e: ChangeEvent<HTMLInputElement>) => void,
    errorMessage: string|undefined,

    needsApproval: boolean,
    dsProxy?: Contract,
    signer?: ethers.providers.JsonRpcSigner,
    token?: {symbol: string, contract: Contract|undefined, decimals: number},

    owner: string,
    form: IForm,
    setApprovalInProgress?: (inProgress: boolean) => void
    }> = ({ 
        useETH, name, amount, onChange, errorMessage,
        needsApproval, token, signer, dsProxy, owner, form, setApprovalInProgress }) => {

    const { provider } = useConnectionContext()

    if (!token || !(token.contract))
        return (<span></span>)

    return (
        <Box>
            <TextFieldWithOneButton
                textField={
                    <TextField
                        fullWidth
                        size="small"
                        margin="normal"
                        variant="outlined"
                        label={`${getTokenSymbolForLabel(token?.symbol, useETH)} to use`}  
                        value={amount}
                        name={name}
                        onChange={onChange}
                        error={errorMessage ? true : false }
                        helperText={errorMessage ? errorMessage : `The ${getTokenSymbolForLabel(token?.symbol, useETH)} amount to use from your account.` }
                        InputProps={{
                            endAdornment: <InputAdornment position="end">{getTokenSymbolForLabel(token?.symbol, useETH)}</InputAdornment>,
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
                            if (!token || !(token.contract))
                                return
                            
                            let balance: BigNumber = ethers.constants.Zero
                            if (getTokenSymbolForLabel(token?.symbol, useETH) === 'ETH'){
                                if (provider)
                                    balance = await provider.getBalance(owner)
                            }
                            else{
                                if (token && token.contract)
                                    balance = await token.contract.balanceOf(owner)
                            }
                                
                            form.setTextValues({ ...(form.textValues as object), [name]: formatUnits(balance, token.decimals) })
                            form.setCleanedValues({ ...(form.cleanedValues as object), [name]: balance })
                        }}>
                        Max
                    </Button>
                }
            ></TextFieldWithOneButton>
            <ApprovalButton
                needsApproval={needsApproval}
                dsProxy={dsProxy}
                signer={signer}
                token={token}
                setApprovalInProgress={setApprovalInProgress}
                error={errorMessage ? true : false}
                />
        </Box>
    )

}

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    backdrop: {
      zIndex: theme.zIndex.drawer + 1,
      color: '#fff',
    },
  }),
);

export default function BusyBackdrop({open, color="primary"}: {open:boolean, color?: CircularProgressProps['color']}) {
    const classes = useStyles();
    return (
        <Backdrop className={classes.backdrop} open={open} >
            <CircularProgress color={color} />
        </Backdrop>
    );
  }

export const apyToPercentage = (apy: number): number => {
    return apy ? (apy-1)*100 : 0
}

export const TransactionGridContainer = withWidth()( (props: WithWidth)  => {
    const { width } = props;
    return (
        <Grid {...props} container spacing={1} alignItems="stretch" direction={width == 'xs'? 'column' : 'row' } justify="center" />
    )
})
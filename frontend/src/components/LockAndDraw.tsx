import { BigNumber } from "@ethersproject/bignumber";
import { formatEther, formatUnits, parseUnits } from "@ethersproject/units";
import { Backdrop, Box, Button, Card, Chip, CircularProgress, createStyles, Divider, FormControlLabel, FormGroup, Grid, InputAdornment, makeStyles, Switch, TextField, Theme, Tooltip, Typography } from "@material-ui/core";
import { Contract, ethers } from "ethers";
import React, { ChangeEvent, useEffect, useState } from "react";
import { useServiceFee } from "../hooks/useServiceFee";
import { useSwapService, IGetAmountsInResult } from "../hooks/useSwapService";
import { encodeParamsForLockGemAndDraw } from "../utils/format";
import { useForm, defaultSideEffect, IChangeBigNumberEvent } from "../utils/forms";
import { useContract } from "./Deployments";
import { decreaseWithTolerance, proxyExecute, deadline } from "./WipeAndFree";
import { useEffectAutoCancel } from "../hooks/useEffectAutoCancel";
import { useBlockContext } from "../contexts/BlockContext";
import { useDsProxyContext } from "../contexts/DsProxyContext";
import { IVaultInfo, useVaultInfoContext, ITokenInfo, ONE_RAY } from "../contexts/VaultInfoContext";
import { initialVaultExpectedOperation, useVaultExpectedOperationContext } from "../contexts/VaultExpectedOperationContext";
import { useVaultExpectedStatusContext, IVaultExpectedStatus } from "../contexts/VaultExpectedStatusContext";
import { formatBigNumber, SimpleCard } from "./VaultInfo";
import { useApyContext } from "../contexts/APYContext";
import { useLendingPool } from "../hooks/useLendingPool";
import { useConnectionContext } from "../contexts/ConnectionContext";
import { OpenVaultButton } from "./OpenVaultButton";
import { useVaultContext } from "../contexts/VaultSelectionContext";

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

export const needsApproval = async (token: Contract, owner: string, spender: string, amount: BigNumber, weth: string, useEth: boolean): Promise<boolean> => {
    if (amount.isZero())
        return false
    if (token.address == weth && useEth)
        return false
    const allowance: BigNumber = await token.allowance(owner, spender)
    return allowance.lt(amount);
}


export const LockAndDraw: React.FC<Props> = ({}) => {

    const { vault, ilkChanged } = useVaultContext()

    const { vaultInfo } = useVaultInfoContext()
    const dai = useContract('Dai')
    const { signer, address } = useConnectionContext()

    const form = useForm<ITextForm, IClenedForm, IFormErrors>(emptyTextForm, emptyClenedForm)
    const [expectedResult, setExpectedResult] = useState<IExpectedResult>(emptyExpectedResult)

    const router02 = useContract('UniswapV2Router02')
    const swapService = useSwapService()

    const { getGrossAmountFromNetAmount } = useServiceFee()


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

        if (!signer || !dai || !vaultInfo.ilkInfo.token0 || !vaultInfo.ilkInfo.token1 || !router02
            || !vaultInfo.ilkInfo.univ2Pair || !weth || !vaultInfo.ilkInfo.gem || !dsProxy
            || !lendingPool.contract) {
            form.setErrors(undefined)
            return
        }

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

        const token0BalanceOfSigner = (
            (token0.address == weth.address && form.cleanedValues.useETH) ?
            yield signer.getBalance()
            : yield token0.balanceOf(signerAddress)
        ) as BigNumber

        if (token0BalanceOfSigner.lt(form.cleanedValues.tokenAFromSigner))
            errors.tokenAFromSigner = `You do not have enough ${getTokenSymbolForLabel(vaultInfo.ilkInfo.token0.symbol, form.cleanedValues.useETH)} in your balance.`

        const token1BalanceOfSigner = (
            (token1.address == weth.address && form.cleanedValues.useETH) ?
            yield signer.getBalance()
            : yield token1.balanceOf(signerAddress)
        ) as BigNumber
        if (token1BalanceOfSigner.lt(form.cleanedValues.tokenBFromSigner))
            errors.tokenBFromSigner = `You do not have enough ${getTokenSymbolForLabel(vaultInfo.ilkInfo.token1.symbol, form.cleanedValues.useETH)} in your balance.`

        const expectedResult = { ...emptyExpectedResult }

        if (form.cleanedValues.tokenAFromSigner.gt(form.cleanedValues.tokenAToLock)){
            errors.tokenAFromSigner = `${getTokenSymbolForLabel(vaultInfo.ilkInfo.token0.symbol, form.cleanedValues.useETH)} from your account could not be higher than ${getTokenSymbolForLabel(vaultInfo.ilkInfo.token0.symbol, form.cleanedValues.useETH)} to lock.`
            expectedResult.tokenAToBuyWithDai = ethers.constants.Zero
        }else{
            expectedResult.tokenAToBuyWithDai = form.cleanedValues.tokenAToLock.sub(form.cleanedValues.tokenAFromSigner)
        }

        const tokenAFromResult = (yield swapService.getAmountsIn(
            dai.address, token0.address, expectedResult.tokenAToBuyWithDai)) as IGetAmountsInResult
        expectedResult.daiForTokenA = tokenAFromResult.amountFrom
        expectedResult.pathFromDaiToTokenA = tokenAFromResult.path
        expectedResult.usePsmForTokenA = tokenAFromResult.psm.buyGem

        if (form.cleanedValues.tokenBFromSigner.gt(form.cleanedValues.tokenBToLock)){
            errors.tokenBFromSigner = `${getTokenSymbolForLabel(vaultInfo.ilkInfo.token1.symbol, form.cleanedValues.useETH)} from your account could not be higher than ${getTokenSymbolForLabel(vaultInfo.ilkInfo.token1.symbol, form.cleanedValues.useETH)} to lock.`
            expectedResult.tokenBToBuyWithDai = ethers.constants.Zero
        }else{
            expectedResult.tokenBToBuyWithDai = form.cleanedValues.tokenBToLock.sub(form.cleanedValues.tokenBFromSigner)
        }

        const tokenBFromResult = (yield swapService.getAmountsIn(
            dai.address, token1.address, expectedResult.tokenBToBuyWithDai)) as IGetAmountsInResult
        expectedResult.daiForTokenB = tokenBFromResult.amountFrom
        expectedResult.pathFromDaiToTokenB = tokenBFromResult.path
        expectedResult.usePsmForTokenB = tokenBFromResult.psm.buyGem

        expectedResult.daiFromFlashLoan = expectedResult.daiForTokenA
            .add(expectedResult.daiForTokenB)
            .sub(form.cleanedValues.daiFromSigner)

        const daiToDrawWithoutServiceFee = expectedResult.daiFromFlashLoan
            .add(lendingPool.getLoanFee(expectedResult.daiFromFlashLoan))

        // Flash loan plus fees.
        expectedResult.daiToDraw = (yield getGrossAmountFromNetAmount(daiToDrawWithoutServiceFee)) as BigNumber

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
            needsApproval(vaultInfo.ilkInfo.gem, signerAddress, dsProxy.address, form.cleanedValues.collateralFromUser, weth.address, form.cleanedValues.useETH),
            needsApproval(vaultInfo.ilkInfo.token0.contract, signerAddress, dsProxy.address, form.cleanedValues.tokenAFromSigner, weth.address, form.cleanedValues.useETH),
            needsApproval(vaultInfo.ilkInfo.token1.contract, signerAddress, dsProxy.address, form.cleanedValues.tokenBFromSigner, weth.address, form.cleanedValues.useETH),
            needsApproval(dai, signerAddress, dsProxy.address, form.cleanedValues.daiFromSigner, weth.address, form.cleanedValues.useETH),
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

            const tokenAToLock = cleanedValue

            setTokenAToLockModifiedByUser(true)
            setTokenBToLockModifiedByUser(false)

            const reserves = await vaultInfo.ilkInfo.univ2Pair.getReserves()
            const [reserve0, reserve1]: BigNumber[] = reserves
            const tokenBToLock = tokenAToLock
                .mul(reserve1).div(reserve0)

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

            const tokenBToLock = cleanedValue

            setTokenAToLockModifiedByUser(false)
            setTokenBToLockModifiedByUser(true)

            const reserves = await vaultInfo.ilkInfo.univ2Pair.getReserves()
            const [reserve0, reserve1]: BigNumber[] = reserves
            const tokenAToLock = tokenBToLock
                .mul(reserve0).div(reserve1)

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
                ethToUse.isZero() ? { gasLimit: 1500000 } : {value: ethToUse, gasLimit: 1500000 }
            )
            await transactionResponse.wait(1)
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

    return (
        <div>
            <Grid container spacing={2} alignItems="flex-start" direction="row" justify="space-evenly">
                <Grid item xs={6}>
                    <SimpleCard>

                        <Typography color="textSecondary" gutterBottom>
                            Transaction Parameters
                        </Typography>

                        <Box m={1}>

                            <TokenFromUserInput 
                                useETH={false}
                                amount={form.textValues.collateralFromUser}
                                name="collateralFromUser"
                                onChange={(e) => form.onChangeBigNumber(e as ChangeEvent<HTMLInputElement>)}
                                errorMessage={form.errors?.collateralFromUser}

                                onChangeUseEth={() => {}}

                                needsApproval={expectedResult.needsGemApproval}
                                dsProxy={dsProxy}
                                signer={signer}
                                token={{symbol: vaultInfo.ilkInfo.symbol, contract: vaultInfo.ilkInfo.gem}} 
                                />
                            
                            <Card variant="outlined"><Box m={1} p={1} >
                                
                                    <TextField 
                                        fullWidth
                                        size="small"
                                        margin="normal"
                                        variant="outlined"
                                        label={`${getTokenSymbolForLabel(vaultInfo.ilkInfo.token0?.symbol, form.cleanedValues.useETH)} To Lock`}
                                        value={form.textValues.tokenAToLock} name="tokenAToLock" onChange={(e) => tokenAToLockChange(e)}
                                        error={form.errors?.tokenAToLock? true : false }
                                        helperText={form.errors?.tokenAToLock? <span>{form.errors?.tokenAToLock}</span> : `The ${getTokenSymbolForLabel(vaultInfo.ilkInfo.token0?.symbol, form.cleanedValues.useETH)} amount to lock in your vault.` }
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

                                        onChangeUseEth={(e) => {
                                            form.setTextValues({...form.textValues, useETH: e.target.checked })
                                            form.setCleanedValues({...form.cleanedValues, useETH: e.target.checked })
                                        }}

                                        needsApproval={expectedResult.needsToken0Approval}
                                        dsProxy={dsProxy}
                                        signer={signer}
                                        token={vaultInfo.ilkInfo.token0} 
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
                                        error={form.errors?.tokenBToLock ? true : false }
                                        helperText={form.errors?.tokenBToLock ? <span>{form.errors?.tokenBToLock}</span> : `The ${getTokenSymbolForLabel(vaultInfo.ilkInfo.token1?.symbol, form.cleanedValues.useETH)} amount to lock in your vault.` }
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

                                        onChangeUseEth={(e) => {
                                            form.setTextValues({...form.textValues, useETH: e.target.checked })
                                            form.setCleanedValues({...form.cleanedValues, useETH: e.target.checked })
                                        }}

                                        needsApproval={expectedResult.needsToken1Approval}
                                        dsProxy={dsProxy}
                                        signer={signer}
                                        token={vaultInfo.ilkInfo.token1} 
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

                                <span hidden={dai?.address==vaultInfo.ilkInfo.token0?.contract.address || dai?.address==vaultInfo.ilkInfo.token1?.contract.address}>

                                    <TokenFromUserInput 
                                        useETH={false}
                                        amount={form.textValues.daiFromSigner}
                                        name="daiFromSigner"
                                        onChange={(e) => daiFromSignerChange(e as ChangeEvent<HTMLInputElement>)}
                                        errorMessage={form.errors?.daiFromSigner || form.errors?.tooMuchDaiFromAccount}

                                        onChangeUseEth={() => {}}

                                        needsApproval={expectedResult.needsDebtTokenApproval}
                                        dsProxy={dsProxy}
                                        signer={signer}
                                        token={{symbol: 'DAI', contract: dai}} 
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
                <Grid item xs={6}>
                    <SimpleCard>
                        
                        <Typography color="textSecondary" gutterBottom>
                            Transaction Summary
                        </Typography>

                        {/* <SummaryValue 
                            label='DAI From Flash Loan'
                            value={formatEther(expectedResult.daiFromFlashLoan)}
                            /> */}

                        <SummaryValue 
                            label='Collateral to lock'
                            value={formatEther(expectedResult.collateralToLock)}
                            comments={[`~ $${formatEther(expectedResult.collateralToLockInUSD)}`, `min.: ${formatEther(expectedResult.minCollateralToLock)}`]}
                            />

                        <SummaryValue 
                            label='Dai to Draw'
                            value={formatEther(expectedResult.daiToDraw)}
                            errors={[ErrorMessage(vaultExpectedStatusErrors.debtCeiling), ErrorMessage(vaultExpectedStatusErrors.debtFloor)]}
                            />

                        <SummaryValue 
                            label='Expected Collateralization Ratio'
                            value={formatEther(vaultExpectedStatus.collateralizationRatio)}
                            comments={vaultExpectedStatus.minCollateralizationRatio? [`min.: ${formatEther(vaultExpectedStatus.minCollateralizationRatio)}`] : []}
                            errors={[ErrorMessage(vaultExpectedStatusErrors.collateralizationRatio), ]}
                            />

                        <SummaryValue 
                            label='Expected Liquidation Price'
                            value={formatBigNumber(vaultExpectedStatus.liquidationPrice, 27)}
                            comments={ vaultExpectedStatus.maxLiquidationPrice? [`max.: ${formatBigNumber(vaultExpectedStatus.maxLiquidationPrice, 27)}`, ] : [] }
                            />

                        <SummaryValue 
                            label="Expected Vault's APY"
                            value={apy.vaultExpectedApy}
                            comments={[`Estimation based on APY from last ${apy.calculationDaysQuantity} day(s)`,]}
                            />

                        <Button 
                            disabled={
                                hasErrors(form.errors) 
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
                            Lock And Draw
                        </Button>
                    </SimpleCard>
                </Grid>
            </Grid>
            <BusyBackdrop open={operationInProgress}></BusyBackdrop>
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
            {comments.map( comment => 
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
    }> = ({ needsApproval, token, signer, dsProxy }) => {
    if (!needsApproval || !token || !(token.contract))
        return (<span></span>)
    return (
        <Tooltip title={`To use ${token?.symbol}, your proxy needs your approval.`}>
            <Box pb={2}>
                <Button
                    fullWidth
                    color="secondary" 
                    variant="outlined" 
                    size="small"
                    onClick={async (e)=>{
                        e.preventDefault()
                        if (!token || !signer || !dsProxy)
                            return
                        await (token.contract as Contract)
                            .connect(signer)
                            .approve(dsProxy.address, ethers.constants.MaxUint256)
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
    onChangeUseEth: (e: ChangeEvent<HTMLInputElement>) => void,

    needsApproval: boolean,
    dsProxy?: Contract,
    signer?: ethers.providers.JsonRpcSigner,
    token?: {symbol: string, contract: Contract|undefined},
    }> = ({ 
        useETH, name, amount, onChange, errorMessage, onChangeUseEth,
        needsApproval, token, signer, dsProxy }) => {

    if (!token || !(token.contract))
        return (<span></span>)

    if (token.symbol!='WETH')
        return (
            <Box>
                <TextField
                            fullWidth
                            size="small"
                            margin="normal"
                            variant="outlined"
                            label={`${getTokenSymbolForLabel(token?.symbol, useETH)} From Account`}  
                            value={amount}
                            name={name}
                            onChange={onChange}
                            error={errorMessage ? true : false }
                            helperText={errorMessage ? <span>{errorMessage}</span> : `The ${getTokenSymbolForLabel(token?.symbol, useETH)} amount to use from your account.` }
                            InputProps={{
                                endAdornment: <InputAdornment position="end">{getTokenSymbolForLabel(token?.symbol, useETH)}</InputAdornment>,
                            }}
                            />
                
                <ApprovalButton
                    needsApproval={needsApproval}
                    dsProxy={dsProxy}
                    signer={signer}
                    token={token}
                    />
            </Box>
        )
        
    return (
        <span>
            <Grid container>
                <Grid xs={8}>
                    <TextField
                        fullWidth
                        size="small"
                        margin="normal"
                        variant="outlined"
                        label={`${getTokenSymbolForLabel(token?.symbol, useETH)} From Account`}  
                        value={amount}
                        name={name}
                        onChange={onChange}
                        error={errorMessage ? true : false }
                        helperText={errorMessage ? <span>{errorMessage}</span> : `The ${getTokenSymbolForLabel(token?.symbol, useETH)} amount to use from your account.` }
                        InputProps={{
                            endAdornment: <InputAdornment position="end">{getTokenSymbolForLabel(token?.symbol, useETH)}</InputAdornment>,
                        }}
                        />
                </Grid>
                <Grid xs={4}>
                    <Box
                        mt={2}
                        hidden={token?.symbol != 'WETH'}
                        >
                        <FormControlLabel
                            control={
                            <Switch
                                size="small"
                                checked={useETH}
                                onChange={onChangeUseEth}
                                name="useETH"
                                color="secondary"
                            />
                            }
                            label="Use ETH"
                            labelPlacement="bottom"
                        />
                    </Box>
                </Grid>
            </Grid>
            
            {/* {expectedResult.pathFromDaiToTokenA.map(address => (<Chip label={address} />))} */}
            
            <ApprovalButton
                needsApproval={needsApproval}
                dsProxy={dsProxy}
                signer={signer}
                token={token}
                />
        </span>
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

export default function BusyBackdrop({open}: {open:boolean}) {
    const classes = useStyles();
    return (
        <Backdrop className={classes.backdrop} open={open} >
            <CircularProgress color="primary" />
        </Backdrop>
    );
  }
import { BigNumber } from "@ethersproject/bignumber";
import { formatEther, formatUnits, parseUnits } from "@ethersproject/units";
import { Contract, ethers } from "ethers";
import React, { useEffect, useState } from "react";
import { useEffectAsync } from "../hooks/useEffectAsync";
import { useServiceFee } from "../hooks/useServiceFee";
import { useSwapService } from "../hooks/useSwapService";
import { encodeParamsForLockGemAndDraw } from "../utils/format";
import { useForm, parseBigNumber, defaultSideEffect } from "../utils/forms";
import { useSigner } from "./Connection";
import { useContract } from "./Deployments";
import { useVaultInfoContext, getCollateralizationRatio, getLiquidationPrice } from "./VaultInfo";
import { useDSProxyContainer, VaultSelection } from "./VaultSelection";
import { decreaseWithTolerance, getLoanFee, increaseWithTolerance, proxyExecute, deadline } from "./WipeAndFree";

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

interface IFormErrors extends IFormFields {

    daiFromSigner: string,
    collateralFromUser: string,

    tokenAToLock: string,
    tokenAFromSigner: string,

    tokenBToLock: string,
    tokenBFromSigner: string,

    slippageTolerance: string, // ratio with 6 decimals
    transactionDeadline: string, // minutes

    useETH: string,
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

    collateralizationRatio: BigNumber,
    minCollateralizationRatio: BigNumber,

    liquidationPrice: BigNumber,
    maxLiquidationPrice: BigNumber,

    needsGemApproval: boolean,
    needsToken0Approval: boolean,
    needsToken1Approval: boolean,
    needsDebtTokenApproval: boolean,

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

    collateralizationRatio: ethers.constants.Zero,
    minCollateralizationRatio: ethers.constants.Zero,

    liquidationPrice: ethers.constants.Zero,
    maxLiquidationPrice: ethers.constants.Zero,

    needsGemApproval: false,
    needsToken0Approval: false,
    needsToken1Approval: false,
    needsDebtTokenApproval: false,

}

export const LockAndDraw: React.FC<Props> = ({ children }) => {

    const { vaultInfo } = useVaultInfoContext()
    const dai = useContract('Dai')
    const signer = useSigner()

    const form = useForm<ITextForm, IClenedForm, IFormErrors>(emptyTextForm, emptyClenedForm)
    const [expectedResult, setExpectedResult] = useState<IExpectedResult>(emptyExpectedResult)

    const router02 = useContract('UniswapV2Router02')
    const swapService = useSwapService()

    const { getGrossAmountFromNetAmount } = useServiceFee()

    useEffectAsync(async () => {

        if (!signer || !dai || !vaultInfo.ilkInfo.token0 || !vaultInfo.ilkInfo.token1 || !router02
            || !vaultInfo.ilkInfo.univ2Pair || !weth || !vaultInfo.ilkInfo.gem || !dsProxy) {
            form.setErrors(undefined)
            return
        }

        const token0 = vaultInfo.ilkInfo.token0.contract
        const token1 = vaultInfo.ilkInfo.token1.contract

        const signerAddress = await signer.getAddress()

        const errors: IFormErrors = { ...emptyFormErrors }

        const gemBalanceOfSigner = await vaultInfo.ilkInfo.gem.balanceOf(signerAddress)
        if (gemBalanceOfSigner.lt(form.cleanedValues.collateralFromUser))
            errors.collateralFromUser = `You do not have enough ${vaultInfo.ilkInfo.symbol} in your balance.`

        const daiBalanceOfSigner = await dai.balanceOf(signerAddress)
        if (daiBalanceOfSigner.lt(form.cleanedValues.daiFromSigner))
            errors.daiFromSigner = "You do not have enough DAI in your balance."

        const token0BalanceOfSigner = 
            (token0.address == weth.address && form.cleanedValues.useETH) ?
            await signer.getBalance()
            : await token0.balanceOf(signerAddress)
        if (token0BalanceOfSigner.lt(form.cleanedValues.tokenAFromSigner))
            errors.tokenAFromSigner = `You do not have enough ${vaultInfo.ilkInfo.token0.symbol} in your balance.`

        const token1BalanceOfSigner = 
            (token1.address == weth.address && form.cleanedValues.useETH) ?
            await signer.getBalance()
            : await token1.balanceOf(signerAddress)
        if (token1BalanceOfSigner.lt(form.cleanedValues.tokenBFromSigner))
            errors.tokenBFromSigner = `You do not have enough ${vaultInfo.ilkInfo.token1.symbol} in your balance.`

        const expectedResult = { ...emptyExpectedResult }

        if (form.cleanedValues.tokenAFromSigner.gt(form.cleanedValues.tokenAToLock)){
            errors.tokenAFromSigner = `${vaultInfo.ilkInfo.token0.symbol} from signer could not be higher than ${vaultInfo.ilkInfo.token0.symbol} to lock.`
            expectedResult.tokenAToBuyWithDai = ethers.constants.Zero
        }else{
            expectedResult.tokenAToBuyWithDai = form.cleanedValues.tokenAToLock.sub(form.cleanedValues.tokenAFromSigner)
        }

        const tokenAFromResult = await swapService.getAmountsIn(
            dai.address, token0.address, expectedResult.tokenAToBuyWithDai)
        expectedResult.daiForTokenA = tokenAFromResult.amountFrom
        expectedResult.pathFromDaiToTokenA = tokenAFromResult.path
        expectedResult.usePsmForTokenA = tokenAFromResult.psm.buyGem

        if (form.cleanedValues.tokenBFromSigner.gt(form.cleanedValues.tokenBToLock)){
            errors.tokenBFromSigner = `${vaultInfo.ilkInfo.token1.symbol} from signer could not be higher than ${vaultInfo.ilkInfo.token1.symbol} to lock.`
            expectedResult.tokenBToBuyWithDai = ethers.constants.Zero
        }else{
            expectedResult.tokenBToBuyWithDai = form.cleanedValues.tokenBToLock.sub(form.cleanedValues.tokenBFromSigner)
        }

        const tokenBFromResult = await swapService.getAmountsIn(
            dai.address, token1.address, expectedResult.tokenBToBuyWithDai)
        expectedResult.daiForTokenB = tokenBFromResult.amountFrom
        expectedResult.pathFromDaiToTokenB = tokenBFromResult.path
        expectedResult.usePsmForTokenB = tokenBFromResult.psm.buyGem

        expectedResult.daiFromFlashLoan = expectedResult.daiForTokenA
            .add(expectedResult.daiForTokenB)
            .sub(form.cleanedValues.daiFromSigner)

        const daiToDrawWithoutServiceFee = expectedResult.daiFromFlashLoan
            .add(getLoanFee(expectedResult.daiFromFlashLoan))

        // Flash loan plus fees.
        expectedResult.daiToDraw = await getGrossAmountFromNetAmount(daiToDrawWithoutServiceFee)

        const { univ2Pair } = vaultInfo.ilkInfo

        const pairTotalSupply: BigNumber = await univ2Pair.totalSupply()
        // const pairToken0Balance: BigNumber = await token0.balanceOf(univ2Pair.address)
        // const pairToken1Balance: BigNumber = await token1.balanceOf(univ2Pair.address)
        const reserves = await vaultInfo.ilkInfo.univ2Pair.getReserves()
        const [pairToken0Balance, pairToken1Balance]: BigNumber[] = reserves

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
            .add(form.cleanedValues.collateralFromUser)

        expectedResult.collateralizationRatio =
            getCollateralizationRatio(
                vaultInfo.ink.add(expectedResult.collateralToLock),
                vaultInfo.dart.add(expectedResult.daiToDraw),
                vaultInfo.price
            )

        expectedResult.minCollateralizationRatio =
            getCollateralizationRatio(
                vaultInfo.ink.add(expectedResult.minCollateralToLock),
                vaultInfo.dart.add(expectedResult.daiToDraw),
                vaultInfo.price
            )

        expectedResult.liquidationPrice =
            getLiquidationPrice(
                vaultInfo.ink.add(expectedResult.collateralToLock),
                vaultInfo.dart.add(expectedResult.daiToDraw),
                vaultInfo.mat
            )

        expectedResult.maxLiquidationPrice =
            getLiquidationPrice(
                vaultInfo.ink.add(expectedResult.minCollateralToLock),
                vaultInfo.dart.add(expectedResult.daiToDraw),
                vaultInfo.mat
            )

        const needsApproval = async (token: Contract, owner: string, spender: string, amount: BigNumber, weth: string, useEth: boolean): Promise<boolean> => {
            if (amount.isZero())
                return false
            if (token.address == weth && useEth)
                return false
            const allowance: BigNumber = await token.allowance(owner, spender)
            return allowance.lt(amount);
        }

        [
            expectedResult.needsGemApproval,
            expectedResult.needsToken0Approval,
            expectedResult.needsToken1Approval,
            expectedResult.needsDebtTokenApproval

        ] = await Promise.all([
            needsApproval(vaultInfo.ilkInfo.gem, signerAddress, dsProxy.address, form.cleanedValues.collateralFromUser, weth.address, form.cleanedValues.useETH),
            needsApproval(vaultInfo.ilkInfo.token0.contract, signerAddress, dsProxy.address, form.cleanedValues.tokenAFromSigner, weth.address, form.cleanedValues.useETH),
            needsApproval(vaultInfo.ilkInfo.token1.contract, signerAddress, dsProxy.address, form.cleanedValues.tokenBFromSigner, weth.address, form.cleanedValues.useETH),
            needsApproval(dai, signerAddress, dsProxy.address, form.cleanedValues.daiFromSigner, weth.address, form.cleanedValues.useETH),
        ])

        setExpectedResult(expectedResult)
        form.setErrors(errors)

    }, [form.cleanedValues, signer, dai, vaultInfo, router02])

    const daiFromSignerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        form.onChangeBigNumber(e)
    }

    const tokenAToLockChange = (e: React.ChangeEvent<HTMLInputElement>) => {

        const sideEffect = async (fieldname: string, textValue: string, cleanedValue: BigNumber) => {
            if (!vaultInfo.ilkInfo.univ2Pair || !vaultInfo.ilkInfo.token1)
                return defaultSideEffect(fieldname, textValue, cleanedValue)
            const tokenAToLock = cleanedValue
            const reserves = await vaultInfo.ilkInfo.univ2Pair.getReserves()
            const [reserve0, reserve1]: BigNumber[] = reserves
            const tokenBToLock = tokenAToLock
                .mul(reserve1).div(reserve0)
            if (tokenBToLock.eq(form.cleanedValues.tokenBToLock))
                return {
                    cleanedValues: {
                        ...form.cleanedValues,
                        tokenAToLock
                    },
                    textValues: {
                        ...form.textValues,
                        tokenAToLock: textValue
                    }
                }
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

    const tokenBToLockChange = (e: React.ChangeEvent<HTMLInputElement>) => {

        const sideEffect = async (fieldname: string, textValue: string, cleanedValue: BigNumber) => {
            if (!vaultInfo.ilkInfo.univ2Pair || !vaultInfo.ilkInfo.token0)
                return defaultSideEffect(fieldname, textValue, cleanedValue)
            const tokenBToLock = cleanedValue
            const reserves = await vaultInfo.ilkInfo.univ2Pair.getReserves()
            const [reserve0, reserve1]: BigNumber[] = reserves
            const tokenAToLock = tokenBToLock
                .mul(reserve0).div(reserve1)
            if (tokenAToLock.eq(form.cleanedValues.tokenAToLock))
                return {
                    cleanedValues: {
                        ...form.cleanedValues,
                        tokenBToLock
                    },
                    textValues: {
                        ...form.textValues,
                        tokenBToLock: textValue
                    }
                }
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

    const removePosition = useContract('RemovePosition');
    const lendingPoolAddressesProvider = useContract('LendingPoolAddressesProvider')
    const { dsProxy } = useDSProxyContainer()
    const dssProxyActions = useContract('DssProxyActions')
    const manager = useContract('DssCdpManager')
    const daiJoin = useContract('DaiJoin')
    const jug = useContract('Jug')
    const weth = useContract('WETH')
    const dssPsm = useContract('DssPsm')


    const doOperation = async (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {

        e.preventDefault()

        if (!removePosition || !signer || !dai || !lendingPoolAddressesProvider || !dsProxy ||
            !vaultInfo.ilkInfo.token0 || !vaultInfo.ilkInfo.token1 || !vaultInfo.ilkInfo.gem ||
            !vaultInfo.ilkInfo.gemJoin || !router02 || !dssProxyActions || !manager ||
            !daiJoin || !vaultInfo.ilkInfo.univ2Pair || !jug || !weth || !dssPsm)
            return

        const sender = await signer.getAddress()

        const operation: BigNumber = await removePosition.LOCK_AND_DRAW()
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

        proxyExecute(
            dsProxy, 'execute(address,bytes)',
            removePosition, 'flashLoanFromDSProxy', [
                sender,
                removePosition.address,
                ownerTokens, // owner tokens to transfer to target
                ownerTokensAmounts, // owner token amounts to transfer to target
                await lendingPoolAddressesProvider.getLendingPool(),
                expectedResult.daiFromFlashLoan.isZero() ? [] : [dai.address], // loanTokens
                expectedResult.daiFromFlashLoan.isZero() ? [] : [expectedResult.daiFromFlashLoan], // loanAmounts
                [BigNumber.from(0)], //modes
                dataForExecuteOperationCallback, // Data to be used on executeOperation
                weth.address
            ],
            ethToUse.isZero() ? {} : {value: ethToUse }
        )

    }

    return (
        <div>

            <p>
                <label>
                    {vaultInfo.ilkInfo.symbol} From Account:
                    <input type="number" value={form.textValues.collateralFromUser} name="collateralFromUser" onChange={(e) => form.onChangeBigNumber(e)} />
                    { expectedResult.needsGemApproval ? <button onClick={async (e)=>{
                        e.preventDefault()
                        if (!vaultInfo.ilkInfo.gem || !signer || !dsProxy)
                            return
                        await vaultInfo.ilkInfo.gem
                            .connect(signer)
                            .approve(dsProxy.address, ethers.constants.MaxUint256)
                    }}>Approve</button> : '' }
                    {form.errors?.collateralFromUser? <span><br></br>{form.errors?.collateralFromUser}</span> : '' }
                </label>
            </p>

            <p>
                <label>
                    <input type="checkbox" checked={form.textValues.useETH} name="useETH" onChange={(e) => {
                            form.setTextValues({...form.textValues, useETH: e.target.checked })
                            form.setCleanedValues({...form.cleanedValues, useETH: e.target.checked })
                        }} />
                    Use ETH
                </label>
            </p>

            <p>
                <label>
                    {vaultInfo.ilkInfo.token0?.symbol} To Lock:
                    <input type="number" value={form.textValues.tokenAToLock} name="tokenAToLock" onChange={(e) => tokenAToLockChange(e)} />
                    {form.errors?.tokenAToLock? <span><br></br>{form.errors?.tokenAToLock}</span> : '' }
                </label>
                <br></br>
                <label>
                    {vaultInfo.ilkInfo.token0?.symbol} From Account:
                    <input type="number" value={form.textValues.tokenAFromSigner} name="tokenAFromSigner" onChange={(e) => tokenAFromSignerChange(e)} />
                    { expectedResult.needsToken0Approval ?
                        <button onClick={async (e)=>{
                            e.preventDefault()
                            if (!vaultInfo.ilkInfo.token0 || !signer || !dsProxy)
                                return
                            await vaultInfo.ilkInfo.token0.contract
                                .connect(signer)
                                .approve(dsProxy.address, ethers.constants.MaxUint256)
                        }}>Approve</button> : '' }
                    {form.errors?.tokenAFromSigner? <span><br></br>{form.errors?.tokenAFromSigner}</span> : '' }
                    <br></br>
                    [{expectedResult.pathFromDaiToTokenA.join(', ')}]
                </label>
            </p>

            <p>
                <label>
                    {vaultInfo.ilkInfo.token1?.symbol} To Lock:
                    <input type="number" value={form.textValues.tokenBToLock} name="tokenBToLock" onChange={(e) => tokenBToLockChange(e)} />
                    {form.errors?.tokenBToLock? <span><br></br>{form.errors?.tokenBToLock}</span> : '' }
                </label>
                <br></br>
                <label>
                    {vaultInfo.ilkInfo.token1?.symbol} From Account:
                    <input type="number" value={form.textValues.tokenBFromSigner} name="tokenBFromSigner" onChange={(e) => tokenBFromSignerChange(e)} />
                    { expectedResult.needsToken1Approval ?
                        <button onClick={async (e)=>{
                            e.preventDefault()
                            if (!vaultInfo.ilkInfo.token1 || !signer || !dsProxy)
                                return
                            await vaultInfo.ilkInfo.token1.contract
                                .connect(signer)
                                .approve(dsProxy.address, ethers.constants.MaxUint256)
                        }}>Approve</button> : '' }
                    {form.errors?.tokenBFromSigner? <span><br></br>{form.errors?.tokenBFromSigner}</span> : '' }
                    <br></br>
                    [{expectedResult.pathFromDaiToTokenB.join(', ')}]
                </label>
            </p>

            <p>
                <label>
                    DAI From Account:
                    <input type="number" value={form.textValues.daiFromSigner} name="daiFromSigner" onChange={(e) => daiFromSignerChange(e)} />
                </label>
                { expectedResult.needsDebtTokenApproval ?
                    <button onClick={async (e)=>{
                            e.preventDefault()
                            if (!dai || !signer || !dsProxy)
                                return
                            await dai
                                .connect(signer)
                                .approve(dsProxy.address, ethers.constants.MaxUint256)
                    }}>Approve</button> : '' }
                {form.errors?.daiFromSigner? <span><br></br>{form.errors?.daiFromSigner}</span> : '' }

                <br></br>
                <label>
                    DAI From Flash Loan: {formatEther(expectedResult.daiFromFlashLoan)}
                </label>
            </p>

            <p>
                <label>
                    Slippage Tolerance (%):
                    <input type="number" value={form.textValues.slippageTolerance} name="slippageTolerance" onChange={(e) => form.onChangeBigNumber(e, 4)} />
                </label>
                <br></br>
                <label>
                    Transaction Deadline (minutes):
                    <input type="number" value={form.textValues.transactionDeadline} name="transactionDeadline" onChange={(e) => form.onChangeBigNumber(e, 0)} />
                </label>
            </p>

            <p>
                Collateral to lock: {formatEther(expectedResult.collateralToLock)} (Min: {formatEther(expectedResult.minCollateralToLock)})
            </p>
            <p>
                Dai to Draw: {formatEther(expectedResult.daiToDraw)}
            </p>
            <p>
                Collateralization Ratio: {formatEther(expectedResult.collateralizationRatio)} (Min: {formatEther(expectedResult.minCollateralizationRatio)})
            </p>
            <p>
                Liquidation Price: {formatUnits(expectedResult.liquidationPrice, 27)} (Max: {formatUnits(expectedResult.maxLiquidationPrice, 27)})
            </p>

            <button onClick={(e) => doOperation(e)}>
                Unifi :)
            </button>

        </div>
    )

}
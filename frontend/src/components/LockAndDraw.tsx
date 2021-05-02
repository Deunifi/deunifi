import { BigNumber } from "@ethersproject/bignumber";
import { formatEther, formatUnits, parseUnits } from "@ethersproject/units";
import { ethers } from "ethers";
import React, { useEffect, useState } from "react";
import { useEffectAsync } from "../hooks/useEffectAsync";
import { useServiceFee } from "../hooks/useServiceFee";
import { encodeParamsForLockGemAndDraw } from "../utils/format";
import { useForm, parseBigNumber, defaultSideEffect } from "../utils/forms";
import { useSigner } from "./Connection";
import { useContract } from "./Deployments";
import { useVaultInfoContext, getCollateralizationRatio, getLiquidationPrice } from "./VaultInfo";
import { useDSProxyContainer } from "./VaultSelection";
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
    daiForTokenB: BigNumber,
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

}

const emptyExpectedResult: IExpectedResult = {

    daiForTokenA: ethers.constants.Zero,
    daiForTokenB: ethers.constants.Zero,
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

}

export const LockAndDraw: React.FC<Props> = ({ children }) => {

    const { vaultInfo } = useVaultInfoContext()
    const dai = useContract('Dai')
    const signer = useSigner()

    const form = useForm<ITextForm, IClenedForm, IFormErrors>(emptyTextForm, emptyClenedForm)
    const [expectedResult, setExpectedResult] = useState<IExpectedResult>(emptyExpectedResult)

    const router02 = useContract('UniswapV2Router02')

    const { getFinalAmount } = useServiceFee()

    useEffectAsync(async () => {

        if (!signer || !dai || !vaultInfo.ilkInfo.token0 || !vaultInfo.ilkInfo.token1 || !router02
            || !vaultInfo.ilkInfo.univ2Pair || !getFinalAmount) {
            form.setErrors(undefined)
            return
        }

        const token0 = vaultInfo.ilkInfo.token0.contract
        const token1 = vaultInfo.ilkInfo.token1.contract

        const signerAddress = await signer.getAddress()

        const errors: IFormErrors = emptyFormErrors

        const daiBalanceOfSigner = await dai.balanceOf(signerAddress)
        if (daiBalanceOfSigner.lt(form.cleanedValues.daiFromSigner))
            errors.daiFromSigner = "You do not have enough DAI in your balance."

        const token0BalanceOfSigner = await token0.balanceOf(signerAddress)
        if (token0BalanceOfSigner.lt(form.cleanedValues.tokenAFromSigner))
            errors.tokenAFromSigner = `You do not have enough ${vaultInfo.ilkInfo.token0.symbol} in your balance.`

        const token1BalanceOfSigner = await token1.balanceOf(signerAddress)
        if (token1BalanceOfSigner.lt(form.cleanedValues.tokenBFromSigner))
            errors.tokenBFromSigner = `You do not have enough ${vaultInfo.ilkInfo.token1.symbol} in your balance.`

        const expectedResult = emptyExpectedResult

        const tokenAToBuyWithDai = form.cleanedValues.tokenAToLock.sub(form.cleanedValues.tokenAFromSigner)
        expectedResult.daiForTokenA = tokenAToBuyWithDai.isZero() ?
            ethers.constants.Zero :
            dai.address == token0.address ?
                tokenAToBuyWithDai
                : (await router02.getAmountsIn(tokenAToBuyWithDai,
                    [dai.address, token0.address,]))[0] // TODO Use dynamic path

        const tokenBToBuyWithDai = form.cleanedValues.tokenBToLock.sub(form.cleanedValues.tokenBFromSigner)
        expectedResult.daiForTokenB = tokenBToBuyWithDai.isZero() ?
            ethers.constants.Zero :
            dai.address == token1.address ?
                tokenBToBuyWithDai
                : (await router02.getAmountsIn(tokenBToBuyWithDai,
                    [dai.address, token1.address,]))[0] // TODO Use dynamic path

        expectedResult.daiFromFlashLoan = expectedResult.daiForTokenA
            .add(expectedResult.daiForTokenB)
            .sub(form.cleanedValues.daiFromSigner)

        const daiToDrawWithoutServiceFee = expectedResult.daiFromFlashLoan
            .add(getLoanFee(expectedResult.daiFromFlashLoan))

        // Flash loan plus fees.
        expectedResult.daiToDraw = await getFinalAmount(daiToDrawWithoutServiceFee)

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

        setExpectedResult({ ...expectedResult })
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


    const doOperation = async (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {

        e.preventDefault()

        if (!removePosition || !signer || !dai || !lendingPoolAddressesProvider || !dsProxy ||
            !vaultInfo.ilkInfo.token0 || !vaultInfo.ilkInfo.token1 || !vaultInfo.ilkInfo.gem ||
            !vaultInfo.ilkInfo.gemJoin || !router02 || !dssProxyActions || !manager ||
            !daiJoin || !vaultInfo.ilkInfo.univ2Pair || !jug || !weth)
            return

        const sender = await signer.getAddress()

        const operation: BigNumber = await removePosition.LOCK_AND_DRAW()
        // const operation = BigNumber.from(2)
        const dataForExecuteOperationCallback = encodeParamsForLockGemAndDraw(
            operation, // operation: BigNumber,
            sender, // sender: string,
            dai.address, // debtToken: string,
            router02.address, // router02: string,
            vaultInfo.ilkInfo.token0.contract.address, // token0: string,
            expectedResult.daiForTokenA, // debtTokenForToken0: BigNumber,
            [dai.address, vaultInfo.ilkInfo.token0.contract.address], // TODO Define path dinamically // pathFromDebtTokenToToken0: string[],
            vaultInfo.ilkInfo.token1.contract.address, // token1: string,
            expectedResult.daiForTokenB, // debtTokenForToken1: BigNumber,
            [dai.address, vaultInfo.ilkInfo.token1.contract.address], // TODO Define path dinamically // pathFromDebtTokenToToken1: string[],
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
                </label>
                <br></br>
                <label>
                    {vaultInfo.ilkInfo.token0?.symbol} From Account:
                    <input type="number" value={form.textValues.tokenAFromSigner} name="tokenAFromSigner" onChange={(e) => tokenAFromSignerChange(e)} />
                    <button onClick={async (e)=>{
                        // TODO Modularize logic and add for the rest of token to transfer from signer to main contract via DSProxy.
                        e.preventDefault()
                        if (!vaultInfo.ilkInfo.token0 || !signer || !dsProxy)
                            return
                        await vaultInfo.ilkInfo.token0.contract
                            .connect(signer)
                            .approve(dsProxy.address, ethers.constants.MaxUint256)
                    }}>Approve</button>
                </label>
            </p>

            <p>
                <label>
                    {vaultInfo.ilkInfo.token1?.symbol} To Lock:
                    <input type="number" value={form.textValues.tokenBToLock} name="tokenBToLock" onChange={(e) => tokenBToLockChange(e)} />
                </label>
                <br></br>
                <label>
                    {vaultInfo.ilkInfo.token1?.symbol} From Account:
                    <input type="number" value={form.textValues.tokenBFromSigner} name="tokenBFromSigner" onChange={(e) => tokenBFromSignerChange(e)} />
                    <button onClick={async (e)=>{
                        e.preventDefault()
                        if (!vaultInfo.ilkInfo.token1 || !signer || !dsProxy)
                            return
                        await vaultInfo.ilkInfo.token1.contract
                            .connect(signer)
                            .approve(dsProxy.address, ethers.constants.MaxUint256)
                    }}>Approve</button>
                </label>
            </p>

            <p>
                <label>
                    DAI From Account:
                    <input type="number" value={form.textValues.daiFromSigner} name="daiFromSigner" onChange={(e) => daiFromSignerChange(e)} />
                </label>
                <button onClick={async (e)=>{
                        // TODO Modularize logic and add for the rest of token to transfer from signer to main contract via DSProxy.
                        e.preventDefault()
                        if (!dai || !signer || !dsProxy)
                            return
                        await dai
                            .connect(signer)
                            .approve(dsProxy.address, ethers.constants.MaxUint256)
                }}>Approve</button>

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
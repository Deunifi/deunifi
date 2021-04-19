import { BigNumber } from "@ethersproject/bignumber";
import { formatEther, formatUnits, parseUnits } from "@ethersproject/units";
import { ethers } from "ethers";
import React, { useEffect, useState } from "react";
import { useEffectAsync } from "../hooks/useEffectAsync";
import { useForm, parseBigNumber, defaultSideEffect } from "../utils/forms";
import { useSigner } from "./Connection";
import { useContract } from "./Deployments";
import { useVaultInfoContext, getCollateralizationRatio, getLiquidationPrice } from "./VaultInfo";
import { getLoanFee, getServiceFee, increaseWithTolerance } from "./WipeAndFree";

interface Props { }

interface IFormFields {

    tokenAToLock: any,
    tokenAFromSigner: any,

    tokenBToLock: any,
    tokenBFromSigner: any,

    daiFromSigner: any,

    slippageTolerance: any, // ratio with 6 decimals
    transactionDeadline: any, // minutes

}

interface IFormErrors extends IFormFields {

    daiFromSigner: string,

    tokenAToLock: string,
    tokenAFromSigner: string,

    tokenBToLock: string,
    tokenBFromSigner: string,

    slippageTolerance: string, // ratio with 6 decimals
    transactionDeadline: string, // minutes

}

const emptyFormErrors: ITextForm = {
    daiFromSigner: '',

    tokenAToLock: '',
    tokenAFromSigner: '',

    tokenBToLock: '',
    tokenBFromSigner: '',

    slippageTolerance: '',
    transactionDeadline: '',
}

interface IClenedForm extends IFormFields {

    daiFromSigner: BigNumber,

    tokenAToLock: BigNumber,
    tokenAFromSigner: BigNumber,

    tokenBToLock: BigNumber,
    tokenBFromSigner: BigNumber,

    slippageTolerance: BigNumber, // ratio with 6 decimals
    transactionDeadline: BigNumber, // minutes

}

const emptyClenedForm: IClenedForm = {

    daiFromSigner: BigNumber.from(0),

    tokenAToLock: BigNumber.from(0),
    tokenAFromSigner: BigNumber.from(0),

    tokenBToLock: BigNumber.from(0),
    tokenBFromSigner: BigNumber.from(0),

    slippageTolerance: parseUnits('.01', 6), // ratio with 6 decimals
    transactionDeadline: BigNumber.from(120), // minutes
}

interface ITextForm extends IFormFields {

    daiFromSigner: string,

    tokenAFromSigner: string,
    tokenBFromSigner: string,

    slippageTolerance: string, // percentage with 4 decimals
    transactionDeadline: string, // minutes
}

const emptyTextForm: ITextForm = {
    daiFromSigner: '',

    tokenAToLock: '',
    tokenAFromSigner: '',

    tokenBToLock: '',
    tokenBFromSigner: '',

    slippageTolerance: formatUnits(emptyClenedForm.slippageTolerance, 4),
    transactionDeadline: emptyClenedForm.transactionDeadline.toString(),
}

interface IExpectedResult {
    daiFromFlashLoan: BigNumber,

    daiToDraw: BigNumber,
    maxDaiToDraw: BigNumber,

    collateralToLock: BigNumber,

    collateralizationRatio: BigNumber,
    minCollateralizationRatio: BigNumber,

    liquidationPrice: BigNumber,
    maxLiquidationPrice: BigNumber,
    
}

const emptyExpectedResult: IExpectedResult = {
    daiFromFlashLoan: ethers.constants.Zero,

    daiToDraw: ethers.constants.Zero,
    maxDaiToDraw: ethers.constants.Zero,

    collateralToLock: ethers.constants.Zero,

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

    useEffectAsync(async () => {

        if (!signer || !dai || !vaultInfo.ilkInfo.token0 || !vaultInfo.ilkInfo.token1 || !router02
            || !vaultInfo.ilkInfo.univ2Pair) {
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


        const tokenAToBuyWithDai = form.cleanedValues.tokenAToLock.sub(form.cleanedValues.tokenAFromSigner)
        const daiForTokenA: BigNumber = tokenAToBuyWithDai.isZero() ?
            ethers.constants.Zero
            : (await router02.getAmountsIn(tokenAToBuyWithDai,
                [dai.address, token0.address,]))[0] // TODO Use dynamic path

        const tokenBToBuyWithDai = form.cleanedValues.tokenBToLock.sub(form.cleanedValues.tokenBFromSigner)
        const daiForTokenB: BigNumber = tokenBToBuyWithDai.isZero() ?
            ethers.constants.Zero
            : (await router02.getAmountsIn(tokenBToBuyWithDai,
                [dai.address, token1.address,]))[0] // TODO Use dynamic path

        const expectedResult = emptyExpectedResult
        expectedResult.daiFromFlashLoan = daiForTokenA
            .add(daiForTokenB)
            .sub(form.cleanedValues.daiFromSigner)

        // Flash loan plus fees.
        expectedResult.daiToDraw = expectedResult.daiFromFlashLoan
            .add(getLoanFee(expectedResult.daiFromFlashLoan))
            .add(getServiceFee(expectedResult.daiFromFlashLoan))

        expectedResult.maxDaiToDraw = increaseWithTolerance(
            expectedResult.daiToDraw,
            form.cleanedValues.slippageTolerance
        )

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

        expectedResult.collateralToLock =
            liquidityUsingToken0.lt(liquidityUsingToken1) ?
                liquidityUsingToken0 :
                liquidityUsingToken1

        expectedResult.collateralizationRatio =
            getCollateralizationRatio(
                vaultInfo.ink.add(expectedResult.collateralToLock),
                vaultInfo.dart.add(expectedResult.daiToDraw),
                vaultInfo.price
            )

        expectedResult.minCollateralizationRatio =
            getCollateralizationRatio(
                vaultInfo.ink.add(expectedResult.collateralToLock),
                vaultInfo.dart.add(expectedResult.maxDaiToDraw),
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
                vaultInfo.ink.add(expectedResult.collateralToLock),
                vaultInfo.dart.add(expectedResult.maxDaiToDraw),
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

    const doOperation = async (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {

        e.preventDefault()

    }

    return (
        <div>

            <p>
                <label>
                    {vaultInfo.ilkInfo.token0?.symbol} To Lock:
                    <input type="number" value={form.textValues.tokenAToLock} name="tokenAToLock" onChange={(e) => tokenAToLockChange(e)} />
                </label>
                <br></br>
                <label>
                    {vaultInfo.ilkInfo.token0?.symbol} From Account:
                    <input type="number" value={form.textValues.tokenAFromSigner} name="tokenAFromSigner" onChange={(e) => tokenAFromSignerChange(e)} />
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
                </label>
            </p>

            <p>
                <label>
                    DAI From Account:
                    <input type="number" value={form.textValues.daiFromSigner} name="daiFromSigner" onChange={(e) => daiFromSignerChange(e)} />
                </label>
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
                Collateral to lock: {formatEther(expectedResult.collateralToLock)}
            </p>
            <p>
                Dai to Draw: {formatEther(expectedResult.daiToDraw)} (Max: {formatEther(expectedResult.maxDaiToDraw)})
                </p>
            <p>
                Collateralization Ratio: {formatEther(expectedResult.collateralizationRatio)} (Min: {formatEther(expectedResult.minCollateralizationRatio)})
            </p>
            <p>
                Liquidation Price: {formatUnits(expectedResult.liquidationPrice, 27)} (Min: {formatUnits(expectedResult.maxLiquidationPrice, 27)})
            </p>

            <button onClick={(e) => doOperation(e)}>
                Unifi :)
            </button>

        </div>
    )

}
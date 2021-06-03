import { BigNumber } from "@ethersproject/bignumber";
import { formatEther, formatUnits, parseUnits } from "@ethersproject/units";
import { TextField } from "@material-ui/core";
import { Contract, ethers } from "ethers";
import React, { ChangeEvent, useEffect, useState } from "react";
import { useServiceFee } from "../hooks/useServiceFee";
import { useSwapService, IGetAmountsInResult } from "../hooks/useSwapService";
import { encodeParamsForLockGemAndDraw } from "../utils/format";
import { useForm, defaultSideEffect, IChangeBigNumberEvent } from "../utils/forms";
import { useSigner } from "./Connection";
import { useContract } from "./Deployments";
import { decreaseWithTolerance, getLoanFee, proxyExecute, deadline } from "./WipeAndFree";
import { useEffectAutoCancel } from "../hooks/useEffectAutoCancel";
import { useBlockContext } from "../contexts/BlockContext";
import { useDsProxyContext } from "../contexts/DsProxyContext";
import { getCollateralizationRatio, getLiquidationPrice, useVaultInfoContext } from "../contexts/VaultInfoContext";
import { initialVaultExpectedOperation, useVaultExpectedOperationContext } from "../contexts/VaultExpectedOperationContext";

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

export const pairDelta = (token: string, [token0, token1]: string[], inSwapResult: IGetAmountsInResult): BigNumber => {
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


export const LockAndDraw: React.FC<Props> = ({ children }) => {

    const { vaultInfo } = useVaultInfoContext()
    const dai = useContract('Dai')
    const signer = useSigner()

    const form = useForm<ITextForm, IClenedForm, IFormErrors>(emptyTextForm, emptyClenedForm)
    const [expectedResult, setExpectedResult] = useState<IExpectedResult>(emptyExpectedResult)

    const router02 = useContract('UniswapV2Router02')
    const swapService = useSwapService()

    const { getGrossAmountFromNetAmount } = useServiceFee()

    const lendingPoolAddressesProvider = useContract('LendingPoolAddressesProvider')
    const lendingPool = useContract('LendingPool')

    const { blocknumber } = useBlockContext()

    useEffectAutoCancel(function* () {

        if (!signer || !dai || !vaultInfo.ilkInfo.token0 || !vaultInfo.ilkInfo.token1 || !router02
            || !vaultInfo.ilkInfo.univ2Pair || !weth || !vaultInfo.ilkInfo.gem || !dsProxy ||
            !lendingPoolAddressesProvider || !lendingPool) {
            form.setErrors(undefined)
            return
        }

        const token0 = vaultInfo.ilkInfo.token0.contract
        const token1 = vaultInfo.ilkInfo.token1.contract

        const signerAddress = (yield signer.getAddress()) as string

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
            errors.tokenAFromSigner = `You do not have enough ${vaultInfo.ilkInfo.token0.symbol} in your balance.`

        const token1BalanceOfSigner = (
            (token1.address == weth.address && form.cleanedValues.useETH) ?
            yield signer.getBalance()
            : yield token1.balanceOf(signerAddress)
        ) as BigNumber
        if (token1BalanceOfSigner.lt(form.cleanedValues.tokenBFromSigner))
            errors.tokenBFromSigner = `You do not have enough ${vaultInfo.ilkInfo.token1.symbol} in your balance.`

        const expectedResult = { ...emptyExpectedResult }

        if (form.cleanedValues.tokenAFromSigner.gt(form.cleanedValues.tokenAToLock)){
            errors.tokenAFromSigner = `${vaultInfo.ilkInfo.token0.symbol} from signer could not be higher than ${vaultInfo.ilkInfo.token0.symbol} to lock.`
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
            errors.tokenBFromSigner = `${vaultInfo.ilkInfo.token1.symbol} from signer could not be higher than ${vaultInfo.ilkInfo.token1.symbol} to lock.`
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

        const attachedLendingPool = lendingPool.attach((yield lendingPoolAddressesProvider.getLendingPool()) as string)

        const daiToDrawWithoutServiceFee = expectedResult.daiFromFlashLoan
            .add((yield getLoanFee(attachedLendingPool, expectedResult.daiFromFlashLoan)) as BigNumber)

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

        ] = (yield Promise.all([
            needsApproval(vaultInfo.ilkInfo.gem, signerAddress, dsProxy.address, form.cleanedValues.collateralFromUser, weth.address, form.cleanedValues.useETH),
            needsApproval(vaultInfo.ilkInfo.token0.contract, signerAddress, dsProxy.address, form.cleanedValues.tokenAFromSigner, weth.address, form.cleanedValues.useETH),
            needsApproval(vaultInfo.ilkInfo.token1.contract, signerAddress, dsProxy.address, form.cleanedValues.tokenBFromSigner, weth.address, form.cleanedValues.useETH),
            needsApproval(dai, signerAddress, dsProxy.address, form.cleanedValues.daiFromSigner, weth.address, form.cleanedValues.useETH),
        ])) as boolean[]

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

        if (!deunifi || !signer || !dai || !lendingPoolAddressesProvider || !dsProxy ||
            !vaultInfo.ilkInfo.token0 || !vaultInfo.ilkInfo.token1 || !vaultInfo.ilkInfo.gem ||
            !vaultInfo.ilkInfo.gemJoin || !router02 || !dssProxyActions || !manager ||
            !daiJoin || !vaultInfo.ilkInfo.univ2Pair || !jug || !weth || !dssPsm)
            return

        const sender = await signer.getAddress()

        const operation: BigNumber = await deunifi.LOCK_AND_DRAW()

        const lendingPoolAddress = await lendingPoolAddressesProvider.getLendingPool()

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
            lendingPoolAddress,
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
            deunifi, 'flashLoanFromDSProxy', [
                sender,
                deunifi.address,
                ownerTokens, // owner tokens to transfer to target
                ownerTokensAmounts, // owner token amounts to transfer to target
                await lendingPoolAddressesProvider.getLendingPool(),
                expectedResult.daiFromFlashLoan.isZero() ? [] : [dai.address], // loanTokens
                expectedResult.daiFromFlashLoan.isZero() ? [] : [expectedResult.daiFromFlashLoan], // loanAmounts
                [BigNumber.from(0)], //modes
                dataForExecuteOperationCallback, // Data to be used on executeOperation
                weth.address
            ],
            ethToUse.isZero() ? { gasLimit: 1500000 } : {value: ethToUse, gasLimit: 1500000 }
        )

    }

    return (
        <div>

            <p>
                <TextField 
                    label={`${vaultInfo.ilkInfo.symbol} From Account`}  
                    type="number" 
                    value={form.textValues.collateralFromUser} 
                    name="collateralFromUser" 
                    onChange={(e) => form.onChangeBigNumber(e as ChangeEvent<HTMLInputElement>)}
                    error={form.errors?.collateralFromUser? true : false }
                    helperText={form.errors?.collateralFromUser? <span><br></br>{form.errors?.collateralFromUser}</span> : `The ${vaultInfo.ilkInfo.symbol} you want to use from your account.` }
                    />
                <br></br>
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
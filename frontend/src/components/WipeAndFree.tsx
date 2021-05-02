import { BigNumber } from '@ethersproject/bignumber';
import { formatBytes32String } from '@ethersproject/strings';
import { formatEther, formatUnits, parseEther, parseUnits } from '@ethersproject/units';
import { Signer } from 'crypto';
import { Contract, errors, ethers, PopulatedTransaction } from 'ethers';
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useEffectAsync } from '../hooks/useEffectAsync';
import { useSigner } from './Connection';
import { useContract } from './Deployments';
import { emptyVaultInfo, IVaultInfo, useVaultInfoContext } from './VaultInfo';
import { useDSProxyContainer, useVaultContext, VaultSelection } from './VaultSelection';
import { TransactionResponse } from "@ethersproject/abstract-provider";
import { encodeParamsForRemovePosition as encodeParamsForWipeAndFree } from '../utils/format';
import { useServiceFee } from '../hooks/useServiceFee';

interface Props { }

interface IWipeAndFreeParameters {

    daiFromSigner: BigNumber,
    daiFromFlashLoan: BigNumber,
    collateralToFree: BigNumber,

    collateralToUseToPayFlashLoan: BigNumber,
    daiFromTokenA: BigNumber,
    daiFromTokenB: BigNumber,

    slippageTolerance: BigNumber, // ratio with 6 decimals
    transactionDeadline: BigNumber, // minutes

}

const emptyWipeAndFreeParameters: IWipeAndFreeParameters = {
    daiFromSigner: BigNumber.from(0),
    daiFromFlashLoan: BigNumber.from(0),
    collateralToFree: BigNumber.from(0),

    collateralToUseToPayFlashLoan: BigNumber.from(0),
    daiFromTokenA: BigNumber.from(0),
    daiFromTokenB: BigNumber.from(0),

    slippageTolerance: parseUnits('.01',6), // ratio with 6 decimals
    transactionDeadline: BigNumber.from(120), // minutes
}

interface IWipeAndFreeForm {

    daiFromSigner: string,
    daiFromFlashLoan: string,
    collateralToFree: string,

    collateralToUseToPayFlashLoan: string,
    daiFromTokenA: string,
    daiFromTokenB: string,

    slippageTolerance: string, // percentage with 4 decimals
    transactionDeadline: string, // minutes
}

const emptyWipeAndFreeForm: IWipeAndFreeForm = {
    daiFromSigner: '',
    daiFromFlashLoan: '',
    collateralToFree: '',

    collateralToUseToPayFlashLoan: '',
    daiFromTokenA: '',
    daiFromTokenB: '',

    slippageTolerance: formatUnits(emptyWipeAndFreeParameters.slippageTolerance, 4),
    transactionDeadline: emptyWipeAndFreeParameters.transactionDeadline.toString(),
}

export const getLoanFee = (amount: BigNumber) => amount.mul(9).div(10000)

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
    overrides: { value?: BigNumber } = {}): Promise<TransactionResponse>{

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

export const WipeAndFree: React.FC<Props> = ({ children }) => {

    // const manager = useContract('DssCdpManager')
    // const vat = useContract('Vat')
    // const spotter = useContract('Spotter')

    const { vaultInfo } = useVaultInfoContext()
    const [params, setParams] = useState<IWipeAndFreeParameters>(emptyWipeAndFreeParameters)
    const [form, setForm] = useState<IWipeAndFreeForm>(emptyWipeAndFreeForm)
    
    const [daiLoanPlusFees, setDaiLoanPlusFees] = useState<BigNumber>(BigNumber.from(0))
    const [daiLoanFees, setDaiLoanFees] = useState<BigNumber>(BigNumber.from(0))
    const [daiServiceFee, setDaiServiceFee] = useState<BigNumber>(BigNumber.from(0))
    const [errors, setErrors] = useState<IErrors>({})
    
    const daiFromTokenAChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
            if (daiFromTokenB.eq(params.daiFromTokenB)){
                setForm({...form, daiFromTokenA: value})
                return
            }
            setParams({...params, daiFromTokenA, daiFromTokenB})
            setForm({...form, daiFromTokenA: value, daiFromTokenB: formatEther(daiFromTokenB)})
        } catch (error) {
            setForm({...form, daiFromTokenA: e.target.value})
        }
    }

    const daiFromTokenBChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
            if (daiFromTokenA.eq(params.daiFromTokenA)){
                setForm({...form, daiFromTokenB: value})
                return
            }
            setParams({...params, daiFromTokenA, daiFromTokenB})
            setForm({...form, daiFromTokenB: value, daiFromTokenA: formatEther(daiFromTokenA)})
        } catch (error) {
            setForm({...form, daiFromTokenB: e.target.value})            
        }
    }

    const router02 = useContract('UniswapV2Router02')
    const dai = useContract('Dai')

    const [token0MinAmountToRecieve, setToken0MinAmountToRecieve] = useState(BigNumber.from(0))
    const [token1MinAmountToRecieve, setToken1MinAmountToRecieve] = useState(BigNumber.from(0))
    const [token0ToRecieve, setToken0ToRecieve] = useState(BigNumber.from(0))
    const [token1ToRecieve, setToken1ToRecieve] = useState(BigNumber.from(0))

    const { getServiceFee } = useServiceFee()

    useEffectAsync(async () => {
        
        const lastDaiLoanFees = getLoanFee(params.daiFromFlashLoan)
        if (!lastDaiLoanFees.eq(daiLoanFees))
            setDaiLoanFees(lastDaiLoanFees)
        
        const lastDaiLoanPlusFeesWithNoServiceFees = params.daiFromFlashLoan
            .add(lastDaiLoanFees)

        if (!getServiceFee)
            return

        const lastDaiLoanPlusFees = lastDaiLoanPlusFeesWithNoServiceFees
            .add(await getServiceFee(params.daiFromFlashLoan))
        if (!lastDaiLoanPlusFees.eq(daiLoanPlusFees))
            setDaiLoanPlusFees(lastDaiLoanPlusFees)

        const lastDaiServiceFee = lastDaiLoanPlusFees.sub(lastDaiLoanPlusFeesWithNoServiceFees)
        if (!lastDaiServiceFee.eq(daiServiceFee))
            setDaiServiceFee(lastDaiServiceFee)

        let errors: IErrors = {}

        if (params.daiFromSigner.add(params.daiFromFlashLoan).gt(vaultInfo.dart))
            errors.tooMuchDai = `You are using more DAI than needed. Max DAI to use ${formatEther(vaultInfo.dart)}.`

        if (params.collateralToFree.gt(vaultInfo.ink))
            errors.tooMuchCollateralToFree = `You are trying to free more collateral than available in your vault. Max collateral to free: ${formatEther(vaultInfo.ink)}`

        /**
         * Collateral -> TokenA, TokenB: 3) Collateral ~ TokenX / ReserveX
         * TokenA -> DAI TokenA: 1) getAmountsIn(DAI TokenA) to obtain TokenA
         * TokenB -> DAI TokenB: 2) getAmountsIn(DAI TokenB) to obtain TokenB
         */
        const [collateralToRemove, token0AmountForDai, token1AmountForDai, pairToken0Balance, pairToken1Balance, pairTotalSupply ] = await ((async () =>{

            const { univ2Pair, token0, token1 } = vaultInfo.ilkInfo

            if (!univ2Pair || !token0 || !token1 || !dai || !router02){
                return [BigNumber.from(0), BigNumber.from(0), BigNumber.from(0), BigNumber.from(0), BigNumber.from(0), BigNumber.from(0),]
            }

            const pairTotalSupply: BigNumber = await univ2Pair.totalSupply()
            const pairToken0Balance: BigNumber = await token0.contract.balanceOf(univ2Pair.address)
            const pairToken1Balance: BigNumber = await token1.contract.balanceOf(univ2Pair.address)
    
            
            // TODO In case of dai, should be the same amount.
            const token0AmountForDai: BigNumber = params.daiFromTokenA.isZero() ?
                BigNumber.from(0) :
                    dai.address == token0.contract.address ?
                        params.daiFromTokenA
                        : (await router02.getAmountsIn(params.daiFromTokenA,
                            [token0.contract.address, dai.address]))[0]

            // TODO In case of dai, should be the same amount.
            const token1AmountForDai: BigNumber = params.daiFromTokenB.isZero() ?
                BigNumber.from(0) :
                dai.address == token1.contract.address ?
                    params.daiFromTokenB
                    : (await router02.getAmountsIn(params.daiFromTokenB,
                        [token1.contract.address, dai.address]))[0]

            const minLiquidityToRemoveForToken0 = token0AmountForDai
                .mul(pairTotalSupply)
                .div(pairToken0Balance)
            const minLiquidityToRemoveForToken1 = token1AmountForDai
                .mul(pairTotalSupply)
                .div(pairToken1Balance)

            const minLiquidityToRemove = 
                minLiquidityToRemoveForToken0.gt(minLiquidityToRemoveForToken1) ?
                    minLiquidityToRemoveForToken0
                    : minLiquidityToRemoveForToken1
            
            return [
                minLiquidityToRemove,
                token0AmountForDai, token1AmountForDai,
                pairToken0Balance, pairToken1Balance, pairTotalSupply]

        })())

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

    }, [params])

    const onChangeBigNumber = (e: React.ChangeEvent<HTMLInputElement>, decimals: number=18) => {
        try {
            const value = parseBigNumber(e.target.value, decimals)
            setParams({...params, [e.target.name]: value})
        } catch (error) {
            
        }
        setForm({...form, [e.target.name]: e.target.value})
    }

    const removePosition = useContract('RemovePosition')
    const signer = useSigner()
    const lendingPoolAddressesProvider = useContract('LendingPoolAddressesProvider')
    const {dsProxy} = useDSProxyContainer()
    const dssProxyActions = useContract('DssProxyActions')
    const manager = useContract('DssCdpManager')
    const daiJoin = useContract('DaiJoin')

    const doOperation = async (e: React.MouseEvent<HTMLButtonElement, MouseEvent>)=>{

        e.preventDefault()

        if (!removePosition || !signer || !dai || !lendingPoolAddressesProvider || !dsProxy || 
            !vaultInfo.ilkInfo.token0 || !vaultInfo.ilkInfo.token1 || !vaultInfo.ilkInfo.gem ||
            !vaultInfo.ilkInfo.gemJoin || !router02 || !dssProxyActions || !manager ||
            !daiJoin)
            return

        const sender = await signer.getAddress()
        
        const dataForExecuteOperationCallback = encodeParamsForWipeAndFree(
                await removePosition.WIPE_AND_FREE(),
                sender, // address sender
                dai.address, // address debtToken;
                params.daiFromSigner.add(params.daiFromFlashLoan), // daiToPay
                vaultInfo.ilkInfo.token0.contract.address, // address tokenA;
                vaultInfo.ilkInfo.token1.contract.address, // address tokenB;
                vaultInfo.ilkInfo.gem.address, // address pairToken;
                params.collateralToFree, // uint collateralAmountToFree;
                params.collateralToUseToPayFlashLoan, // uint collateralAmountToUseToPayDebt;
                params.daiFromTokenA, // uint debtToCoverWithTokenA;
                params.daiFromTokenB, // uint debtToCoverWithTokenB;
                // TODO Resolve better path dinamically.
                [vaultInfo.ilkInfo.token0.contract.address, dai.address], // address[] pathTokenAToDebtToken;
                // TODO Resolve better path dinamically.
                [vaultInfo.ilkInfo.token1.contract.address, dai.address], // address[] pathTokenBToDebtToken;
                token0MinAmountToRecieve, // uint minTokenAToRecive;
                token1MinAmountToRecieve, // uint minTokenAToRecive;
                getLoanFee(params.daiFromFlashLoan), // uint loanFee
                deadline(params.transactionDeadline.toNumber()*60),
                dsProxy.address,
                dssProxyActions.address,
                manager.address,
                vaultInfo.ilkInfo.gemJoin.address,
                daiJoin.address,
                vaultInfo.cdp,
                router02.address,
        )

        proxyExecute(
            dsProxy, 'execute(address,bytes)',
            removePosition, 'flashLoanFromDSProxy',[
                sender,
                removePosition.address,
                params.daiFromSigner.isZero() ? [] : [dai.address], // owner tokens to transfer to target
                params.daiFromSigner.isZero() ? [] : [params.daiFromSigner], // owner token amounts to transfer to target
                await lendingPoolAddressesProvider.getLendingPool(),
                params.daiFromFlashLoan.isZero() ? [] : [dai.address], // loanTokens
                params.daiFromFlashLoan.isZero() ? [] : [params.daiFromFlashLoan], // loanAmounts
                [BigNumber.from(0)], //modes
                dataForExecuteOperationCallback, // Data to be used on executeOperation
                ethers.constants.AddressZero
            ]
        )
    }

    return (
        <form>
            <p>
                <label>
                    DAI From Signer:
                    <input type="number" value={form.daiFromSigner} name="daiFromSigner" onChange={(e) => onChangeBigNumber(e)}/>
                </label>
                <br></br>
                <label>
                    DAI From Flash Loan:
                    <input type="number" value={form.daiFromFlashLoan} name="daiFromFlashLoan" onChange={(e) => onChangeBigNumber(e)}/>
                    <button onClick={(e)=>{
                        e.preventDefault()
                        setForm({...form, daiFromFlashLoan: formatEther(vaultInfo.dart)})
                        setParams({...params, daiFromFlashLoan: vaultInfo.dart})
                    }}>Max</button>
                </label>
            </p>

            <p>
                {errors.tooMuchDai ? <div>{errors.tooMuchDai}<br></br></div> : ''}
                {daiLoanFees.isZero() ? '' : <div>Flash Loan Fees (0.09%): {formatEther(daiLoanFees)} DAI<br></br></div>}
                {daiServiceFee.isZero() ? '' : <div>Service Fee (0.03%): {formatEther(daiServiceFee)} DAI<br></br></div>}
                {daiLoanPlusFees.isZero() ? '' : <div>Total Dai to get from collateral: {formatEther(daiLoanPlusFees)} DAI<br></br></div>}
            </p>

            <p>
                <label>
                    DAI Covered With {vaultInfo.ilkInfo.token0?.symbol}:
                    <input type="number" value={form.daiFromTokenA} name="daiFromSigner" onChange={ (e) => daiFromTokenAChange(e) }/>
                </label>
                <br></br>
                <label>
                    DAI Covered With {vaultInfo.ilkInfo.token1?.symbol}:
                    <input type="number" value={form.daiFromTokenB} name="daiFromFlashLoan"  onChange={ (e) => daiFromTokenBChange(e) }/>
                </label>
            </p>

            <p>
                {errors.notEnoughDaiToCoverFlashLoanAndFees ? <div>{errors.notEnoughDaiToCoverFlashLoanAndFees}<br></br></div> : ''}
                {errors.invalidCombinationOfDaiAmount ? <div>{errors.invalidCombinationOfDaiAmount}<br></br></div> : ''}
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
                    {errors.notEnoughCollateralToCoverDai ? <p>{errors.notEnoughCollateralToCoverDai}</p> : ''}
                    {errors.notEnoughCollateralToCoverDai? 
                        '': 
                        <div>
                            <div>
                                Amount of {vaultInfo.ilkInfo.token0?.symbol} to recieve: 
                                    {formatUnits(token0ToRecieve,vaultInfo.ilkInfo.token0?.decimals || 18)} {vaultInfo.ilkInfo.token0?.symbol} (min: 
                                        {formatUnits(token0MinAmountToRecieve,vaultInfo.ilkInfo.token0?.decimals || 18)} {vaultInfo.ilkInfo.token0?.symbol})
                                    <br></br>
                            </div>
                            <div>
                                Amount of {vaultInfo.ilkInfo.token1?.symbol} to recieve: 
                                    {formatUnits(token1ToRecieve,vaultInfo.ilkInfo.token1?.decimals || 18)} {vaultInfo.ilkInfo.token1?.symbol} (min: 
                                        {formatUnits(token1MinAmountToRecieve,vaultInfo.ilkInfo.token1?.decimals || 18)} {vaultInfo.ilkInfo.token1?.symbol})
                                    <br></br>
                            </div>
                        </div>}
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
                    {errors.tooMuchCollateralToFree ? <p>{errors.tooMuchCollateralToFree}</p> : ''}
                    {errors.notEnoughCollateralToFree ? <p>{errors.notEnoughCollateralToFree}</p> : ''}
                    {(errors.tooMuchCollateralToFree || errors.notEnoughCollateralToFree) ? 
                        '': 
                        <div>
                            <div>Amount of {vaultInfo.ilkInfo.symbol} to recieve: {formatUnits(params.collateralToFree.sub(params.collateralToUseToPayFlashLoan), vaultInfo.ilkInfo.dec)} {vaultInfo.ilkInfo.symbol}<br></br></div>
                        </div>}

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

            <button onClick={(e) => doOperation(e)}>
                Unifi :)
            </button>
        </form>

    )

}
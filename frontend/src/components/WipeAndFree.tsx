import { BigNumber } from '@ethersproject/bignumber';
import { formatBytes32String } from '@ethersproject/strings';
import { formatEther, formatUnits, parseEther, parseUnits } from '@ethersproject/units';
import { Contract, errors } from 'ethers';
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useEffectAsync } from '../hooks/useEffectAsync';
import { useContract } from './Deployments';
import { emptyVaultInfo, IVaultInfo, useVaultInfoContext } from './VaultInfo';
import { useVaultContext, VaultSelection } from './VaultSelection';

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

export const getServiceFee = (amount: BigNumber) => amount.mul(3).div(10000)

export const parseBigNumber = (text:string, decimals=18) => text ? parseUnits(text, decimals) : BigNumber.from(0)

interface IErrors {
    tooMuchDai?: string,
    tooMuchCollateralToFree?: string
    notEnoughCollateralToCoverDai?: string,
    notEnoughCollateralToFree?: string,
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
            const daiFromTokenA = parseBigNumber(e.target.value)
            const daiFromTokenB = daiLoanPlusFees.sub(daiFromTokenA)
            if (daiFromTokenB.eq(params.daiFromTokenB)){
                setForm({...form, daiFromTokenA: e.target.value})
                return
            }
            setParams({...params, daiFromTokenA, daiFromTokenB})
            setForm({...form, daiFromTokenA: e.target.value, daiFromTokenB: formatEther(daiFromTokenB)})
        } catch (error) {
            setForm({...form, daiFromTokenA: e.target.value})
        }
    }

    const daiFromTokenBChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        try {
            const daiFromTokenB = parseBigNumber(e.target.value)
            const daiFromTokenA = daiLoanPlusFees.sub(daiFromTokenB)
            if (daiFromTokenA.eq(params.daiFromTokenA)){
                setForm({...form, daiFromTokenB: e.target.value})
                return
            }
            setParams({...params, daiFromTokenA, daiFromTokenB})
            setForm({...form, daiFromTokenB: e.target.value, daiFromTokenA: formatEther(daiFromTokenA)})
        } catch (error) {
            setForm({...form, daiFromTokenB: e.target.value})            
        }
    }

    const router02 = useContract('UniswapV2Router02')
    const dai = useContract('Dai')

    const [token0MinAmountToRecieve, setToken0MinAmountToRecieve] = useState(BigNumber.from(0))
    const [token1MinAmountToRecieve, setToken1MinAmountToRecieve] = useState(BigNumber.from(0))

    useEffectAsync(async () => {
        
        const lastDaiLoanFees = getLoanFee(params.daiFromFlashLoan)
        if (!lastDaiLoanFees.eq(daiLoanFees))
            setDaiLoanFees(lastDaiLoanFees)
        
        const lastDaiServiceFee = getServiceFee(params.daiFromFlashLoan.add(params.daiFromSigner))
        if (!lastDaiServiceFee.eq(daiServiceFee))
            setDaiServiceFee(lastDaiServiceFee)

        const lastDaiLoanPlusFees = params.daiFromFlashLoan
            .add(lastDaiLoanFees)
            .add(lastDaiServiceFee)
        if (!lastDaiLoanPlusFees.eq(daiLoanPlusFees))
            setDaiLoanPlusFees(lastDaiLoanPlusFees)

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
        const [minCollateralToRemove, token0AmountForDai, token1AmountForDai, pairToken0Balance, pairToken1Balance, pairTotalSupply ] = await ((async () =>{

            const { univ2Pair, token0, token1 } = vaultInfo.ilkInfo

            if (!univ2Pair || !token0 || !token1 || !dai || !router02){
                return [BigNumber.from(0), BigNumber.from(0), BigNumber.from(0), BigNumber.from(0), BigNumber.from(0), BigNumber.from(0),]
            }

            const pairTotalSupply: BigNumber = await univ2Pair.totalSupply()
            const pairToken0Balance: BigNumber = await token0.contract.balanceOf(univ2Pair.address)
            const pairToken1Balance: BigNumber = await token1.contract.balanceOf(univ2Pair.address)
    
            
            // TODO In case of dai, should be the same amount.
            const token0AmountForDai: BigNumber = params.daiFromTokenA.isZero() ?
                BigNumber.from(0)
                : (await router02.getAmountsIn(
                    params.daiFromTokenA, [token0.contract.address, dai.address]))[0];

            const token1AmountForDai: BigNumber = params.daiFromTokenB.isZero() ?
                BigNumber.from(0)
                : (await router02.getAmountsIn(
                    params.daiFromTokenB, [token1.contract.address, dai.address]))[0];

            const minLiquidityToRemoveForToken0 = token0AmountForDai
                .mul(pairTotalSupply)
                .div(pairToken0Balance)
            const minLiquidityToRemoveForToken1 = token1AmountForDai
                .mul(pairTotalSupply)
                .div(pairToken1Balance)

            const minLiquidityToRemove = minLiquidityToRemoveForToken0.gt(minLiquidityToRemoveForToken1) ?
                minLiquidityToRemoveForToken0
                : minLiquidityToRemoveForToken1
            
            return [minLiquidityToRemove, token0AmountForDai, token1AmountForDai, pairToken0Balance, pairToken1Balance, pairTotalSupply]

        })())

        const token0ToRecieve = pairTotalSupply.isZero()? 
            BigNumber.from(0) : 
            params.collateralToUseToPayFlashLoan.mul(pairToken0Balance).div(pairTotalSupply)
        const token1ToRecieve = pairTotalSupply.isZero()? 
            BigNumber.from(0) : 
            params.collateralToUseToPayFlashLoan.mul(pairToken1Balance).div(pairTotalSupply)

        setToken0MinAmountToRecieve(token0ToRecieve.sub(token0AmountForDai))
        setToken1MinAmountToRecieve(token1ToRecieve.sub(token1AmountForDai))

        const SLIPPAGE_TOLERANCE_UNIT = parseUnits('1', 6)

        const minCollateralToRemoveWithTolerance = minCollateralToRemove
            .mul(SLIPPAGE_TOLERANCE_UNIT.add(params.slippageTolerance))
            .div(SLIPPAGE_TOLERANCE_UNIT)

        if (params.collateralToUseToPayFlashLoan.lt(minCollateralToRemoveWithTolerance))
            errors.notEnoughCollateralToCoverDai = `The amount to remove from pool it is not enough. Minimal amount is ${formatEther(minCollateralToRemoveWithTolerance)}.`

        if (params.collateralToFree.lt(params.collateralToUseToPayFlashLoan))
            errors.notEnoughCollateralToFree = `The collateral amount to free from vault it is not enough. Minimal amount is ${formatEther(params.collateralToUseToPayFlashLoan)}.`

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
                <label>
                    {vaultInfo.ilkInfo.symbol} To Remove From Pool:
                    <input type="number" value={form.collateralToUseToPayFlashLoan} name="collateralToUseToPayFlashLoan" onChange={(e) => onChangeBigNumber(e)}/>
                    {errors.notEnoughCollateralToCoverDai ? <p>{errors.notEnoughCollateralToCoverDai}</p> : ''}
                    {errors.notEnoughCollateralToCoverDai? 
                        '': 
                        <div>
                            <div>Min Amount of {vaultInfo.ilkInfo.token0?.symbol} to recieve: {formatUnits(token0MinAmountToRecieve,vaultInfo.ilkInfo.token0?.decimals || 18)} {vaultInfo.ilkInfo.token0?.symbol}<br></br></div>
                            <div>Min Amount of {vaultInfo.ilkInfo.token1?.symbol} to recieve: {formatUnits(token1MinAmountToRecieve,vaultInfo.ilkInfo.token1?.decimals || 18)} {vaultInfo.ilkInfo.token1?.symbol}<br></br></div>
                        </div>}
                </label>

                <br></br>
                <label>
                    {vaultInfo.ilkInfo.symbol} To Free From Vault:
                    <input type="number" value={form.collateralToFree} name="collateralToFree" onChange={(e) => onChangeBigNumber(e)}/>
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

            <input type="submit" value="Submit" />
        </form>

    )
}
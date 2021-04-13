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

    slippageTolerance: BigNumber.from(0), // ratio with 6 decimals
    transactionDeadline: BigNumber.from(0), // minutes
}

interface IWipeAndFreeForm {

    daiFromSigner: string,
    daiFromFlashLoan: string,
    collateralToFree: string,

    collateralToUseToPayFlashLoan: string,
    daiFromTokenA: string,
    daiFromTokenB: string,

    slippageTolerance: string, // ratio with 6 decimals
    transactionDeadline: string, // minutes
}

const emptyWipeAndFreeForm: IWipeAndFreeForm = {
    daiFromSigner: '',
    daiFromFlashLoan: '',
    collateralToFree: '',

    collateralToUseToPayFlashLoan: '',
    daiFromTokenA: '',
    daiFromTokenB: '',

    slippageTolerance: '',
    transactionDeadline: '',
}

export const getLoanFee = (amount: BigNumber) => amount.mul(9).div(10000)

export const getServiceFee = (amount: BigNumber) => amount.mul(3).div(10000)

export const parseBigNumber = (text:string, decimals=18) => text ? parseUnits(text, decimals) : BigNumber.from(0)

interface IErrors {
    tooMuchDai?: string,
    tooMuchCollateralToFree?: string
    notEnoughCollateralToCoverDai?: string
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
        const minCollateralToRemove = await ((async () =>{

            const { univ2Pair, token0, token1 } = vaultInfo.ilkInfo

            if (!univ2Pair || !token0 || !token1 || !dai || !router02){
                return BigNumber.from(0)
            }

            const pairTotalSupply: BigNumber = await univ2Pair.totalSupply()
            
            // TODO In case of dai, should be the same amount.
            const token0AmountForDai: BigNumber = params.daiFromTokenA.isZero() ?
                BigNumber.from(0)
                : (await router02.getAmountsIn(
                    params.daiFromTokenA, [token0.contract.address, dai.address]))[0];

            const token1AmountForDai: BigNumber = params.daiFromTokenB.isZero() ?
                BigNumber.from(0)
                : (await router02.getAmountsIn(
                    params.daiFromTokenB, [token1.contract.address, dai.address]))[0];

            const pairToken0Balance: BigNumber = await token0.contract.balanceOf(univ2Pair.address)
            const pairToken1Balance: BigNumber = await token1.contract.balanceOf(univ2Pair.address)
    
            const minLiquidityToRemoveForToken0 = token0AmountForDai
                .mul(pairTotalSupply)
                .div(pairToken0Balance)
            const minLiquidityToRemoveForToken1 = token1AmountForDai
                .mul(pairTotalSupply)
                .div(pairToken1Balance)

            const minLiquidityToRemove = minLiquidityToRemoveForToken0.gt(minLiquidityToRemoveForToken1) ?
                minLiquidityToRemoveForToken0
                : minLiquidityToRemoveForToken1

            return minLiquidityToRemove

        })())

        if (params.collateralToUseToPayFlashLoan.lt(minCollateralToRemove))
            errors.notEnoughCollateralToCoverDai = `The amount to remove from pool it is not enough. Minimal amount is ${formatEther(minCollateralToRemove)}.`

        setErrors(errors)

    }, [params])

    const onChangeBigNumber = (e: React.ChangeEvent<HTMLInputElement>) => {
        try {
            const value = parseBigNumber(e.target.value)
            setParams({...params, [e.target.name]: value})
        } catch (error) {
            
        }
        setForm({...form, [e.target.name]: e.target.value})
    }

    return (
        <form>
            <br></br>
            <label>
                DAI From Signer:
                <input type="number" value={form.daiFromSigner} name="daiFromSigner" onChange={(e) => onChangeBigNumber(e)}/>
            </label>
            <br></br>
            <label>
                DAI From Flash Loan:
                <input type="number" value={form.daiFromFlashLoan} name="daiFromFlashLoan" onChange={(e) => onChangeBigNumber(e)}/>
            </label>
            {errors.tooMuchDai ? <p>{errors.tooMuchDai}</p> : ''}
            {daiLoanFees.isZero() ? '' : <p>Flash Loan Fees (0.09%): {formatEther(daiLoanFees)} DAI</p>}
            {daiServiceFee.isZero() ? '' : <p>Service Fee (0.03%): {formatEther(daiServiceFee)} DAI</p>}
            {daiLoanPlusFees.isZero() ? '' : <p>Total Dai to get from collateral: {formatEther(daiLoanPlusFees)} DAI</p>}

            <br></br>
            <label>
                DAI Covered With {vaultInfo.ilkInfo.token0?.symbol}:
                <input type="number" value={form.daiFromTokenA} name="daiFromSigner" onChange={ (e) => daiFromTokenAChange(e) }/>
            </label>
            <br></br>
            <label>
                DAI Covered With {vaultInfo.ilkInfo.token1?.symbol}:
                <input type="number" value={form.daiFromTokenB} name="daiFromFlashLoan"  onChange={ (e) => daiFromTokenBChange(e) }/>
            </label>
            <br></br>


            <br></br>
            <label>
                {vaultInfo.ilkInfo.symbol} To Remove From Pool:
                <input type="number" value={form.collateralToUseToPayFlashLoan} name="collateralToUseToPayFlashLoan" onChange={(e) => onChangeBigNumber(e)}/>
                {errors.notEnoughCollateralToCoverDai ? <p>{errors.notEnoughCollateralToCoverDai}</p> : ''}
            </label>
            <br></br>
            <label>
                {vaultInfo.ilkInfo.symbol} To Free From Vault:
                <input type="number" value={form.collateralToFree} name="collateralToFree" onChange={(e) => onChangeBigNumber(e)}/>
                {errors.tooMuchCollateralToFree ? <p>{errors.tooMuchCollateralToFree}</p> : ''}
            </label>
            <br></br>


            <br></br>
            <br></br>
            <input type="submit" value="Submit" />
        </form>

    )
}
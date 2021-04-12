import { BigNumber } from '@ethersproject/bignumber';
import { formatBytes32String } from '@ethersproject/strings';
import { formatEther, formatUnits, parseEther, parseUnits } from '@ethersproject/units';
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useEffectAsync } from '../hooks/useEffectAsync';
import { useContract } from './Deployments';
import { emptyVaultInfo, IVaultInfo, useVaultInfoContext } from './VaultInfo';
import { useVaultContext, VaultSelection } from './VaultSelection';

interface Props { }

interface IWipeAndFreeParameters {

    daiFromSigner: BigNumber,
    daiFromFlashLoan: BigNumber,
    gemToFree: BigNumber,

    gemToUseToPayFlashLoan: BigNumber,
    daiFromTokenA: BigNumber,
    daiFromTokenB: BigNumber,

    slippageTolerance: BigNumber, // ratio with 6 decimals
    transactionDeadline: BigNumber, // minutes
}

const emptyWipeAndFreeParameters: IWipeAndFreeParameters = {
    daiFromSigner: BigNumber.from(0),
    daiFromFlashLoan: BigNumber.from(0),
    gemToFree: BigNumber.from(0),

    gemToUseToPayFlashLoan: BigNumber.from(0),
    daiFromTokenA: BigNumber.from(0),
    daiFromTokenB: BigNumber.from(0),

    slippageTolerance: BigNumber.from(0), // ratio with 6 decimals
    transactionDeadline: BigNumber.from(0), // minutes
}

interface IWipeAndFreeForm {

    daiFromSigner: string,
    daiFromFlashLoan: string,
    gemToFree: string,

    gemToUseToPayFlashLoan: string,
    daiFromTokenA: string,
    daiFromTokenB: string,

    slippageTolerance: string, // ratio with 6 decimals
    transactionDeadline: string, // minutes
}

const emptyWipeAndFreeForm: IWipeAndFreeForm = {
    daiFromSigner: '',
    daiFromFlashLoan: '',
    gemToFree: '',

    gemToUseToPayFlashLoan: '',
    daiFromTokenA: '',
    daiFromTokenB: '',

    slippageTolerance: '',
    transactionDeadline: '',
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

    const daiFromTokenAChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        try {
            const daiFromTokenA = parseEther(e.target.value)
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
            const daiFromTokenB = parseEther(e.target.value)
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

    const onChangeDaiFromFlashLoan = (e: React.ChangeEvent<HTMLInputElement>) => {
        try {

            const daiFromFlashLoan = parseEther(e.target.value)
            setParams({...params, daiFromFlashLoan})
            
            const lastDaiLoanFees = daiFromFlashLoan.mul(9).div(10000)
            if (!lastDaiLoanFees.eq(daiLoanFees))
                setDaiLoanFees(lastDaiLoanFees)

            const lastDaiLoanPlusFees = daiFromFlashLoan.add(lastDaiLoanFees)
            if (!lastDaiLoanPlusFees.eq(daiLoanPlusFees))
                setDaiLoanPlusFees(lastDaiLoanPlusFees)

        } catch (error) {
            
        }

        setForm({...form, daiFromFlashLoan: e.target.value})
    }

    const onChangeBigNumber = (e: React.ChangeEvent<HTMLInputElement>) => {
        try {
            const value = parseEther(e.target.value)
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
                <input type="number" value={form.daiFromFlashLoan} name="daiFromFlashLoan" onChange={(e) => onChangeDaiFromFlashLoan(e)}/>
                {daiLoanFees.isZero() ? '' : <p>(Fees 0.09%: {formatEther(daiLoanFees)})</p>}
            </label>
            <br></br>
            <br></br>
            <label>
                DAI From Token A:
                <input type="number" value={form.daiFromTokenA} name="daiFromSigner" onChange={ (e) => daiFromTokenAChange(e) }/>
            </label>
            <br></br>
            <label>
                DAI From Token B:
                <input type="number" value={form.daiFromTokenB} name="daiFromFlashLoan"  onChange={ (e) => daiFromTokenBChange(e) }/>
            </label>

            <input type="submit" value="Submit" />
        </form>

    )
}
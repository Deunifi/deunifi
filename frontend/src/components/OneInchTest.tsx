import { Contract } from "@ethersproject/contracts";
import { BigNumber, ethers } from "ethers";
import React, { useState } from "react";
import { useContract } from "./Deployments";
import { formatUnits, parseUnits } from "@ethersproject/units";
import { useEffectAutoCancel } from "../hooks/useEffectAutoCancel";
import { useConnectionContext } from "../contexts/ConnectionContext";

interface IForm {
}

interface ITextForm extends IForm {
    tokenFrom: string,
    tokenTo: string,
    tokenFromAmount: string,
    parts: string,
    flags: string,
    slippageTolerance: string, // ratio with 6 decimals
    gasPrice: string,
}

const initialForm: ITextForm = {
    tokenFrom: '',
    tokenTo: '',
    tokenFromAmount: '0',
    parts: '1',
    flags: '0',
    slippageTolerance: '1', // ratio with 6 decimals
    gasPrice: '0',
}

interface IExpectedResult {
    tokenFromAmount: BigNumber,
    parts: BigNumber,
    slippageTolerance: BigNumber, // ratio with 6 decimals
    featureFlags: BigNumber,
    tokenFrom: {
        contract?: Contract,
        symbol: string,
        decimals: number,
    },
    tokenTo: {
        contract?: Contract,
        symbol: string,
        decimals: number,
    },
    tokenToAmount: BigNumber,
    minReturn: BigNumber,
    distribution: BigNumber[],
    gasPrice: BigNumber,
    tokenToAmountWithGas: BigNumber,
    estimateGasAmount: BigNumber,
    minReturnWithGas: BigNumber,
    distributionWithGas: BigNumber[],
}

const initialExpectedResult: IExpectedResult = {
    tokenFromAmount: ethers.constants.Zero,
    parts: ethers.constants.One,
    slippageTolerance: parseUnits(initialForm.slippageTolerance, 6), // ratio with 6 decimals
    featureFlags: ethers.constants.Zero,
    tokenFrom: {
        symbol: '',
        decimals: 18,
    },
    tokenTo: {
        symbol: '',
        decimals: 18,
    },
    tokenToAmount: ethers.constants.Zero,
    minReturn: ethers.constants.Zero,
    distribution: [],
    gasPrice: ethers.constants.Zero,
    tokenToAmountWithGas: ethers.constants.Zero,
    estimateGasAmount: ethers.constants.Zero,
    minReturnWithGas: ethers.constants.Zero,
    distributionWithGas: [],
}

interface Props { }

export const OneInchTest: React.FC<Props> = ({ children }) => {

    const [form, setForm] = useState<ITextForm>(initialForm)
    const [expectedResult, setExpectedResult] = useState<IExpectedResult>(initialExpectedResult)

    const { signer } = useConnectionContext()

    const oneSplitAudit = useContract('OneSplitAudit')
    const erc20 = useContract('Gem')

    useEffectAutoCancel(function* (){

        setExpectedResult(prev => initialExpectedResult)

        if (!erc20 || !oneSplitAudit)
            return

        let _expectedResult: IExpectedResult = { ...expectedResult }

        try {
            if (form.tokenFrom == ''){
                _expectedResult.tokenFrom.contract = erc20.attach(ethers.constants.AddressZero)
                _expectedResult.tokenFrom.decimals = 18
                _expectedResult.tokenFrom.symbol = 'ETH'
            }else{
                _expectedResult.tokenFrom.contract = erc20.attach(form.tokenFrom)
                _expectedResult.tokenFrom.decimals = (yield _expectedResult.tokenFrom.contract.decimals()) as number
                _expectedResult.tokenFrom.symbol = (yield _expectedResult.tokenFrom.contract.symbol()) as string
            }
            _expectedResult.tokenFromAmount = parseUnits(form.tokenFromAmount, _expectedResult.tokenFrom.decimals)
        } catch (error) {
            console.error(error)
        }

        try {
            if (form.tokenTo == ''){
                _expectedResult.tokenTo.contract = erc20.attach(ethers.constants.AddressZero)
                _expectedResult.tokenTo.decimals = 18
                _expectedResult.tokenTo.symbol = 'ETH'
            }else{
                _expectedResult.tokenTo.contract = erc20.attach(form.tokenTo)
                _expectedResult.tokenTo.decimals = (yield _expectedResult.tokenTo.contract.decimals()) as number
                _expectedResult.tokenTo.symbol = (yield _expectedResult.tokenTo.contract.symbol()) as string
            }
        } catch (error) {
            console.error(error)
        }

        try {
            _expectedResult.parts = BigNumber.from(form.parts)
        } catch (error) {
            console.error(error)            
        }
        
        try {
            _expectedResult.slippageTolerance = parseUnits(form.slippageTolerance, 6)
        } catch (error) {
            console.error(error)            
        }
        
        try {
            _expectedResult.featureFlags = BigNumber.from(form.flags)
        } catch (error) {
            console.error(error)            
        }

        try {
            if (_expectedResult.tokenFrom.contract && _expectedResult.tokenTo.contract)
                [_expectedResult.tokenToAmount, _expectedResult.distribution] = 
                    (yield oneSplitAudit.getExpectedReturn(
                        _expectedResult.tokenFrom.contract.address,
                        _expectedResult.tokenTo.contract.address,
                        _expectedResult.tokenFromAmount,
                        _expectedResult.parts,
                        _expectedResult.featureFlags
                    )) as [BigNumber, BigNumber[]]
        } catch (error) {
            console.error(error)            
        }

        const MAX_TOLERANCE = parseUnits('100', 6)
        try {
            _expectedResult.minReturn = _expectedResult.tokenToAmount
                .mul(MAX_TOLERANCE.sub(_expectedResult.slippageTolerance))
                .div(MAX_TOLERANCE)
        } catch (error) {
            console.error(error)            
        }

        // try {
        //     _expectedResult.gasPrice = parseUnits(form.gasPrice, 9)
        // } catch (error) {
        //     console.error(error)            
        // }


        // try {
        //     if (_expectedResult.tokenFrom.contract && _expectedResult.tokenTo.contract && 
        //         _expectedResult.gasPrice.gt(ethers.constants.Zero))
        //         [_expectedResult.tokenToAmountWithGas, _expectedResult.estimateGasAmount, _expectedResult.distributionWithGas] = 
        //             await oneSplitAudit.getExpectedReturnWithGas(
        //                 _expectedResult.tokenFrom.contract.address,
        //                 _expectedResult.tokenTo.contract.address,
        //                 _expectedResult.tokenFromAmount,
        //                 _expectedResult.parts,
        //                 _expectedResult.featureFlags,
        //                 _expectedResult.tokenToAmount.mul(_expectedResult.gasPrice)
        //             )
        // } catch (error) {
        //     console.error(error)            
        // }

        // try {
        //     _expectedResult.minReturnWithGas = _expectedResult.tokenToAmountWithGas
        //         .mul(MAX_TOLERANCE.sub(_expectedResult.slippageTolerance))
        //         .div(MAX_TOLERANCE)
        // } catch (error) {
        //     console.error(error)            
        // }
    
        setExpectedResult(_expectedResult)

    }, [form])

    function processFormChange(e: React.ChangeEvent<HTMLInputElement>){
        setForm({...form, [e.target.name]: e.target.value})
    }

    async function doOperation(){
        if (!oneSplitAudit || !expectedResult.tokenFrom.contract || !signer || !expectedResult.tokenTo.contract)
            return

        let override = {}

        if (expectedResult.tokenFrom.contract.address == ethers.constants.AddressZero)
            override = { value: expectedResult.tokenFromAmount }

        oneSplitAudit.connect(signer).swap(
            expectedResult.tokenFrom.contract.address,
            expectedResult.tokenTo.contract.address,
            expectedResult.tokenFromAmount,
            expectedResult.minReturn,
            expectedResult.distribution,
            expectedResult.featureFlags,
            override
        )
    }

    return (
        <div>
            <p>
                <label>
                    Token Address from ({expectedResult.tokenFrom.symbol}):
                    <input type="string" name="tokenFrom" onChange={(e) => processFormChange(e)} />
                </label>
                <button onClick={async (e)=>{
                        e.preventDefault()
                        if (!expectedResult.tokenFrom.contract || !signer)
                            return
                        await expectedResult.tokenFrom.contract
                            .connect(signer)
                            .approve(oneSplitAudit?.address, ethers.constants.MaxUint256)
                }}>Approve</button>
            </p>
            <p>
                <label>
                    Token Address to ({expectedResult.tokenTo.symbol}):
                    <input type="string" name="tokenTo" onChange={(e) => processFormChange(e)} />
                </label>
            </p>
            <p>
                <label>
                    Amount from ({expectedResult.tokenFrom.symbol}):
                    <input type="number" name="tokenFromAmount" onChange={(e) => processFormChange(e)} />
                </label>
            </p>
            <p>
                <label>
                    Parts:
                    <input type="number" name="parts" onChange={(e) => processFormChange(e)} />
                </label>
            </p>
            <p>
                <label>
                    Flags:
                    <input type="number" name="flags" onChange={(e) => processFormChange(e)} />
                </label>
            </p>
            <p>
                <label>
                    Slippage Tolerance (%):
                    <input type="number" name="slippageTolerance" onChange={(e) => processFormChange(e)} />
                </label>
            </p>
            <p>
                Amount to: {formatUnits(expectedResult.tokenToAmount, expectedResult.tokenTo.decimals)} 
                (Min: {formatUnits(expectedResult.minReturn, expectedResult.tokenTo.decimals)})
            </p>

            {/* <p>
                <label>
                    Gas price (in gwei):
                    <input type="number" name="gasPrice" onChange={(e) => processFormChange(e)} />
                </label>
            </p>
            <p>
                Amount to (gas est. {formatUnits(expectedResult.estimateGasAmount, 9)}): {formatUnits(expectedResult.tokenToAmountWithGas, expectedResult.tokenTo.decimals)} 
                (Min: {formatUnits(expectedResult.minReturnWithGas, expectedResult.tokenTo.decimals)})
            </p> */}

            <p>
                <label>

                    <button onClick={async (e) => {
                        e.preventDefault()
                        doOperation()
                    }}>
                        Swap
                    </button>
                </label>

            </p>
        </div>
    )
}
import { Contract } from "@ethersproject/contracts";
import { BigNumber, ethers } from "ethers";
import React, { useState } from "react";
import { useSigner } from "./Connection";
import { useContract } from "./Deployments";
import { formatEther, formatUnits, parseEther, parseUnits } from "@ethersproject/units";
import { useEffectAutoCancel } from "../hooks/useEffectAutoCancel";

interface IExpectedResult {
    gemAmountTo: BigNumber,
    daiAmountTo: BigNumber,
    gemJoin?: Contract,
    gem?: Contract,
    gemDecimals: number,
    feeDaiToRecive: BigNumber,
    feeDaiToUse: BigNumber,

}

const initialExpectedResult: IExpectedResult = {
    gemAmountTo: ethers.constants.Zero,
    daiAmountTo: ethers.constants.Zero,
    gemDecimals: 0,
    feeDaiToRecive: ethers.constants.Zero,
    feeDaiToUse: ethers.constants.Zero,
}

interface Props { }

export const PsmTest: React.FC<Props> = ({ children }) => {

    const [amountFrom, setAmountFrom] = useState<BigNumber>(ethers.constants.Zero)
    const [expectedResult, setExpectedResult] = useState<IExpectedResult>(initialExpectedResult)

    const signer = useSigner()

    const dssPsm = useContract('DssPsm')
    const gem = useContract('Gem')
    const gemJoin = useContract('GemJoin')
    const dai = useContract('Dai')

    useEffectAutoCancel(function* (){

        const _expectedResult = { ...expectedResult }

        if (!signer || !gem || !gemJoin || !dssPsm)
            return

        const gemJoinAddress = (yield dssPsm.gemJoin()) as string
        _expectedResult.gemJoin = gemJoin.attach(gemJoinAddress)

        const gemAddress = (yield _expectedResult.gemJoin.gem()) as string
        _expectedResult.gem = gem.attach(gemAddress)

        _expectedResult.gemDecimals = (yield _expectedResult.gem.decimals()) as number

        _expectedResult.feeDaiToRecive = (yield dssPsm.tin()) as BigNumber // sell gem
        _expectedResult.feeDaiToUse = (yield dssPsm.tout()) as BigNumber // buy gem

        _expectedResult.daiAmountTo = amountFrom.
            sub(_expectedResult.feeDaiToRecive.mul(amountFrom).div(parseEther('1')))

        // from = to + fee*to = (1+fee)*to => to = from/(1+fee)
        _expectedResult.gemAmountTo = amountFrom.mul(parseUnits('1',_expectedResult.gemDecimals))
            .div(_expectedResult.feeDaiToUse.add(parseEther('1')))

        setExpectedResult(_expectedResult)

    }, [amountFrom, signer, dssPsm, gem, gemJoin])

    function processFormChange(e: React.ChangeEvent<HTMLInputElement>){
        try {
            setAmountFrom(parseEther(e.target.value))
        } catch (error) {
            console.error(error);
        }
    }

    async function sellGem(){
        if (!dssPsm || !signer)
            return

        dssPsm.connect(signer).sellGem(
            await signer.getAddress(),
            amountFrom
                .mul(parseUnits('1', expectedResult.gemDecimals))
                .div(parseEther('1'))
        )
    }

    async function buyGem(){
        if (!dssPsm || !signer)
            return

        dssPsm.connect(signer).buyGem(
            await signer.getAddress(),
            expectedResult.gemAmountTo
        )
    }

    return (
        <div>
            <p>
            <button onClick={async (e)=>{
                        e.preventDefault()
                        if (!signer || !expectedResult.gem || !expectedResult.gemJoin)
                            return
                        await expectedResult.gem
                            .connect(signer)
                            .approve(expectedResult.gemJoin.address, ethers.constants.MaxUint256)
                }}>Approve Gem</button>
                <button onClick={async (e)=>{
                        e.preventDefault()
                        if (!dssPsm || !signer || !dai)
                            return
                        await dai
                            .connect(signer)
                            .approve(dssPsm.address, ethers.constants.MaxUint256)
                }}>Approve DAI</button>
            </p>
            <p>
                <label>
                    Amount From:
                    <input type="number" name="amountFrom" onChange={(e) => processFormChange(e)} />
                </label>
            </p>
            <p>
                Gem to: {formatUnits(expectedResult.gemAmountTo, expectedResult.gemDecimals)} 
            </p>
            <p>
                Dai to: {formatEther(expectedResult.daiAmountTo)} 
            </p>

            <p>
            <label>
                    <button onClick={async (e) => {
                        e.preventDefault()
                        sellGem()
                    }}>
                        Sell Gem
                    </button>
                </label>
                <label>
                    <button onClick={async (e) => {
                        e.preventDefault()
                        buyGem()
                    }}>
                        Buy Gem
                    </button>
                </label>

            </p>
        </div>
    )
}
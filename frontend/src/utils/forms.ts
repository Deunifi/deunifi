import { BigNumber } from "@ethersproject/bignumber"
import { parseUnits } from "@ethersproject/units"
import { useState } from "react"

export const parseBigNumber = (text:string, decimals=18) => text ? parseUnits(text, decimals) : BigNumber.from(0)

interface ISideEffectResult {
    cleanedValues: object,
    textValues: object,
}

export const defaultSideEffect = async (
    fieldname: string, textValue: string, cleanedValue: BigNumber
    ): Promise<ISideEffectResult> => {
    return {
        cleanedValues:{
            [fieldname]: cleanedValue
        },
        textValues:{
            [fieldname]: textValue
        }
    }
}

export interface IChangeBigNumberEvent {
    target: {
        value: string, 
        name: string
    }
}

/**
 * 
 * @param textInitialValues Text representation for form fields.
 * @param cleanedInitialValues Internal representation for form fields.
 * @returns 
 */
export const useForm = <T, C, E>(textInitialValues: T, cleanedInitialValues: C) =>{
    const [textValues, setTextValues] = useState<T>(textInitialValues)
    const [cleanedValues, setCleanedValues] = useState<C>(cleanedInitialValues)
    const [errors, setErrors] = useState<E>()

    const onChangeBigNumber = async (
        e: IChangeBigNumberEvent,
        decimals: number=18,
        sideEffect=defaultSideEffect
        ) => {
        
        try {
            const value = parseBigNumber(e.target.value, decimals)
            const sideEffectResult = await sideEffect(e.target.name, e.target.value, value)
            setCleanedValues({...cleanedValues, ...sideEffectResult.cleanedValues})
            setTextValues({...textValues, ...sideEffectResult.textValues})
        } catch (error) {
            setTextValues({...textValues, [e.target.name]: e.target.value})            
        }

    }

    return { textValues, cleanedValues, setTextValues, setCleanedValues, onChangeBigNumber, errors, setErrors }

}


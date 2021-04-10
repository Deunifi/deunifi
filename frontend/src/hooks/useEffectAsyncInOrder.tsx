import { DependencyList, useEffect, useRef } from "react";

type EffectAsyncCallback = () => Promise<void>;

/**
 * Waits that previous execution of asyncFunction to finish, before start again.
 * This is to prevent inconsistent values during render (for exemple if the actual
 * execution of the effect finish before the previous execution).
 * @param asyncFunction 
 * @param deps 
 */
export function useEffectAsyncInOrder(asyncFunction: EffectAsyncCallback, deps: DependencyList){

    // Initially there is no last call, so it is a promise that it is resolved.
    const lastCall = useRef(Promise.resolve()) 

    useEffect(() => {

        const doAsync = async() => {

            // We wait for last call to be resolved
            await lastCall.current;

            // Now we create a promise for the actual execution to be resolved.
            lastCall.current = new Promise(async (resolve) =>{

                try {
                    await asyncFunction()                    
                } catch (error) {
                    console.error(error);
                    
                }

                // When finish mark as resolved the last call.
                resolve(undefined)
    
            })
    
        }

        doAsync()

    },deps)

}

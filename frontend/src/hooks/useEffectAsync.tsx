import { DependencyList, MutableRefObject, useEffect, useRef } from "react";

type EffectAsyncCallback = () => Promise<void>;

/**
 * Waits that previous execution of asyncFunction to finish, before start again.
 * This is to prevent inconsistent values during render (for exemple if the actual
 * execution of the effect finish before the previous execution).
 * @lastCallRef Should be initialized in a component using useRef(Promise.resolve()).
 * @param asyncFunction 
 * @param deps 
 */
export const useEffectAsync = (
    asyncFunction: EffectAsyncCallback, 
    deps: DependencyList
    ) => {

    const lastCallRef = useRef(Promise.resolve())

    useEffect(() => {

        const doAsync = async() => {

            // We wait for last call to be resolved
            await lastCallRef.current;

            // Now we create a promise for the actual execution to be resolved.
            lastCallRef.current = asyncFunction()

            await lastCallRef.current;

        }

        doAsync()

    },deps)

}

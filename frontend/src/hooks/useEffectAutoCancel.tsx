import { useRef } from "react";
import { CPromiseGenerator, useAsyncEffect } from "use-async-effect2";

/**
 * Waits that previous execution of asyncFunction to finish, before start again.
 * This is to prevent inconsistent values during render (for exemple if the actual
 * execution of the effect finish before the previous execution).
 * @lastCallRef Should be initialized in a component using useRef(Promise.resolve()).
 * @param asyncFunction 
 * @param deps 
 */
export const useEffectAutoCancel = (
    generator: CPromiseGenerator, 
    deps: any[]
    ) => {

    const effectInExecution = useRef<boolean>(false)

    const cancel = useAsyncEffect(function* (){

            if (effectInExecution.current)
                cancel()
            
            effectInExecution.current = true

            yield* generator()

            effectInExecution.current = false
        }
        ,deps
    )


}

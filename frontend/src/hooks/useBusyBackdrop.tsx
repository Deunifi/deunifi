import { Backdrop, CircularProgress, CircularProgressProps, createStyles, makeStyles, Theme } from "@material-ui/core";
import { useRef, useState } from "react";
import { CPromiseGenerator, useAsyncEffect } from "use-async-effect2";

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    backdrop: {
      zIndex: theme.zIndex.drawer + 1,
      color: '#fff',
    },
  }),
);

/**
 * Waits that previous execution of asyncFunction to finish, before start again.
 * This is to prevent inconsistent values during render (for exemple if the actual
 * execution of the effect finish before the previous execution).
 * @lastCallRef Should be initialized in a component using useRef(Promise.resolve()).
 * @param asyncFunction 
 * @param deps 
 */
export const useBusyBackdrop = ({color="primary"}: {color?: CircularProgressProps['color']}) => {

    const [inProgress, setInProgress] = useState(false)

    const classes = useStyles();

    return {
        backdrop: 
            <Backdrop className={classes.backdrop} open={inProgress} >
                <CircularProgress color={color} />
            </Backdrop>,
        setInProgress
    }

}

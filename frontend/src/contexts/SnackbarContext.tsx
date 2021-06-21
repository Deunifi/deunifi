import React, { createContext, useContext, useEffect, useState } from "react";
import { useConnectionContext } from "./ConnectionContext";
import { TransactionResponse } from "@ethersproject/abstract-provider";
import { Button, IconButton, Slide, Snackbar, Tooltip } from "@material-ui/core";
import { Close } from '@material-ui/icons';
import { useEtherscanBaseUrl } from "../hooks/useEtherscanBaseUrl";
import { TransitionProps } from "@material-ui/core/transitions/transition";

interface ISnackbarContextValue{
    transactionInProgress: (t: TransactionResponse) => void,
    transactionConfirmed: (t: TransactionResponse) => void,
}

const initialSnackbarContextValue: ISnackbarContextValue = {
    transactionInProgress: (t: TransactionResponse) => {},
    transactionConfirmed: (t: TransactionResponse) => {},
}

const SnackbarContext = createContext<ISnackbarContextValue>(initialSnackbarContextValue)

const { Provider } = SnackbarContext

export const useSnackbarContext = () => useContext(SnackbarContext)

interface Props { }

function SlideTransition(props: TransitionProps) {
    return <Slide {...props} direction="down" />;
  }

export const SnackbarProvider: React.FC<Props> = ({ children }) => {

    interface ISnackbarState{
        open: boolean,
        
    }

    const [open, setOpen] = useState<boolean>(false)
    const [message, setMessage] = useState<string>('')
    const [buttonTitle, setButtonTitle] = useState<string>('')
    const [onClick, setOnclick] = useState<{onClick: () => void}>({onClick: () => {}})
    const etherscanBaseUrl = useEtherscanBaseUrl()

    const [value, setValue] = useState<ISnackbarContextValue>(initialSnackbarContextValue)

    useEffect(() => {

        setValue({
            transactionInProgress: (t: TransactionResponse) => {
                setOpen(false)
                setTimeout(()=>{
                    setOpen(true)
                    setMessage('Transaction in progress!')
                    setButtonTitle('View your transaction on Etherscan.')
                    setOnclick({
                        onClick: () => {
                            window.open(`${etherscanBaseUrl}/tx/${t.hash}`, "_blank")
                        }
                    })    
                }, 500)
            },
            transactionConfirmed: (t: TransactionResponse) => {
                setOpen(false)
                setTimeout(()=>{

                    setOpen(true)
                    setMessage('Transaction confirmed!')
                    setButtonTitle('View your transaction on Etherscan.')
                    setOnclick({
                        onClick: () => {
                            window.open(`${etherscanBaseUrl}/tx/${t.hash}`, "_blank")
                        }
                    })
                }, 500)
            },
        })
        
    }, [etherscanBaseUrl])

    return (
        <Provider value={ value }>
            {children}
            <Snackbar
                TransitionComponent={SlideTransition}
                anchorOrigin={{
                vertical: 'top',
                horizontal: 'center',
                }}
                open={open}
                // autoHideDuration={6000}
                // onClose={ () => setOpen(false)}
                message={message}
                action={
                <React.Fragment>
                    <Tooltip title={buttonTitle} hidden={etherscanBaseUrl? false: true}>
                        <Button  color="primary" variant="contained" size="small" onClick={() => { onClick.onClick() }}>
                            View Transaction
                        </Button>
                    </Tooltip>
                    
                    <IconButton size="small" aria-label="close" color="inherit" onClick={() => setOpen(false)}>
                        <Close fontSize="small"/>
                    </IconButton>
                </React.Fragment>
                }
            />
        </Provider>
    )

}

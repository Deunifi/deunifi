import React, { useContext, useEffect, useState } from 'react';
import { DeploymentsContext } from "./Deployments";

interface Props { }

export const Greeter: React.FC<Props> = () => {
    const { greeter } = useContext(DeploymentsContext)

    const [message, setMessage] = useState("");
    const [inputGreeting, setInputGreeting] = useState("");
    useEffect(() => {
        const doAsync = async () => {
            if (!greeter) return
            console.log("Greeter is deployed at ", greeter.address)
            setMessage(await greeter.greet())

        };
        doAsync();
    }, [greeter])

    const handleSetGreeting = async (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
        e.preventDefault()
        if (greeter) {
            const tx = await greeter.setGreeting(inputGreeting)
            console.log("setGreeting tx", tx)
            await tx.wait()
            console.log("New greeting mined, result: ", await greeter.greet())
        }
    }
    return (
        <div>
            <p>{message}</p>
            <input onChange={(e) => setInputGreeting(e.target.value)}></input>
            <button onClick={(e) => handleSetGreeting(e)}>Set greeting</button>
        </div>
    )
}
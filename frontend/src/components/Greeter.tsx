import React, { useEffect, useState } from 'react';
import { useContract } from "./Deployments";
import { Greeter as GreeterContract } from "../hardhat/types/Greeter"

interface Props { }

export const Greeter: React.FC<Props> = () => {
    const greeter = useContract('Greeter') as GreeterContract

    const [message, setMessage] = useState("");
    const [inputGreeting, setInputGreeting] = useState("");
    useEffect(() => {
        const doAsync = async () => {
            if (!greeter) return
            console.log("Greeter is deployed at ", greeter.address)
            setMessage(await greeter.greet())
            greeter.on('GreetingChanged', (...[sender, newGreeting]) => {
                setMessage(newGreeting)
            })
        };
        doAsync();
    }, [greeter])

    const handleSetGreeting = async (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
        e.preventDefault()
        if (greeter) {
            const tx = await greeter.setGreeting(inputGreeting)
            console.log("setGreeting tx", tx)
            await tx.wait()
            const actualGreet = await greeter.greet()
            console.log("New greeting mined, result: ", actualGreet)
            setMessage(actualGreet)
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
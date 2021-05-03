import { BigNumber, ethers } from "ethers"

function asTupple(componentsTypes: string[]){
    return `tuple(${componentsTypes.join(',')})`
}

export const encodeParamsForRemovePosition = (
    operation: BigNumber,
    sender: string,
    debtToken: string,
    debtToPay: BigNumber,
    tokenA: string,
    tokenB: string,
    pairToken: string,
    collateralAmountToFree: BigNumber,
    collateralAmountToUseToPayDebt: BigNumber,
    debtToCoverWithTokenA: BigNumber,
    debtToCoverWithTokenB: BigNumber,
    pathTokenAToDebtToken: string[],
    pathTokenBToDebtToken: string[],
    minTokenAToRecive: BigNumber,
    minTokenBToRecive: BigNumber,
    deadline: BigNumber,
    dsProxy: string,
    dsProxyActions: string,
    manager: string,
    gemJoin: string,
    daiJoin: string,
    cdp: BigNumber,
    router02: string,
    weth: string,
): string => {

    const operationData = ethers.utils.defaultAbiCoder.encode([
        asTupple([
            'address',
            'address',
            'uint256',
            'address',
            'address',
            'address',
            'uint256',
            'uint256',
            'uint256',
            'uint256',
            'address[]',
            'address[]',
            'uint256',
            'uint256',
            'uint256',
            'address',
            'address',
            'address',
            'address',
            'address',
            'uint256',
            'address',
            'address',
        ]),
    ],[
        [
            sender,
            debtToken,
            debtToPay,
            tokenA,
            tokenB,
            pairToken,
            collateralAmountToFree,
            collateralAmountToUseToPayDebt,
            debtToCoverWithTokenA,
            debtToCoverWithTokenB,
            pathTokenAToDebtToken,
            pathTokenBToDebtToken,
            minTokenAToRecive,
            minTokenBToRecive,
            deadline,
            dsProxy,
            dsProxyActions,
            manager,
            gemJoin,
            daiJoin,
            cdp,
            router02,
            weth,
        ]
    ]
    )

    return ethers.utils.defaultAbiCoder.encode([
        asTupple([
            "uint8",
            "bytes",
        ])
    ],[
        [
            operation,
            operationData,
        ]
    ])
}

export const encodeParamsForLockGemAndDraw = (
    operation: BigNumber,
    sender: string,
    debtToken: string,
    router02: string,
    token0: string,
    debtTokenForToken0: BigNumber,
    pathFromDebtTokenToToken0: string[],
    token1: string,
    debtTokenForToken1: BigNumber,
    pathFromDebtTokenToToken1: string[],
    token0FromUser: BigNumber,
    token1FromUser: BigNumber,
    minCollateralToBuy: BigNumber,
    collateralFromUser: BigNumber,
    gemToken: string,
    dsProxy: string,
    dsProxyActions: string,
    manager: string,
    jug: string,
    gemJoin: string,
    daiJoin: string,
    cdp: BigNumber,
    debtTokenToDraw: BigNumber,
    transferFrom: boolean,
    deadline: BigNumber,
): string => {

    const operationData = ethers.utils.defaultAbiCoder.encode([
        asTupple([
            'address',
            'address',
            'address',
            'address',
            'uint256',
            'address[]',
            'address',
            'uint256',
            'address[]',
            'uint256',
            'uint256',
            'uint256',
            'uint256',
            'address',
            'address',
            'address',
            'address',
            'address',
            'address',
            'address',
            'uint256',
            'uint256',
            'bool',
            'uint256',  
        ])
    ],[
        [
            sender,
            debtToken,
            router02,
            token0,
            debtTokenForToken0,
            pathFromDebtTokenToToken0,
            token1,
            debtTokenForToken1,
            pathFromDebtTokenToToken1,
            token0FromUser,
            token1FromUser,
            minCollateralToBuy,
            collateralFromUser,
            gemToken,
            dsProxy,
            dsProxyActions,
            manager,
            jug,
            gemJoin,
            daiJoin,
            cdp,
            debtTokenToDraw,
            transferFrom,
            deadline,    
        ]
    ]
    )

    return ethers.utils.defaultAbiCoder.encode([
        asTupple([
            "uint8",
            "bytes",
        ])
    ],[
        [
            operation,
            operationData,
        ]
    ])
}

import { BigNumber, ethers } from "ethers"

function asTupple(componentsTypes: string[]){
    return `tuple(${componentsTypes.join(',')})`
}

export const encodeParamsForWipeAndFree = (
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

    // PSM swap parameters
    tokenToSwapWithPsm: string,
    tokenJoinForSwapWithPsm: string,
    psm: string,
    psmSellGemAmount: BigNumber,
    expectedDebtTokenFromPsmSellGemOperation: BigNumber,

    lendingPool: string,

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
            'address',
            'address',
            'address',
            'uint256',
            'uint256',
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
            tokenToSwapWithPsm,
            tokenJoinForSwapWithPsm,
            psm,
            psmSellGemAmount,
            expectedDebtTokenFromPsmSellGemOperation,
            lendingPool,
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
    psm: string,
    token0: string,
    debtTokenForToken0: BigNumber,
    token0FromDebtToken: BigNumber,
    pathFromDebtTokenToToken0: string[],
    usePsmForToken0: boolean,
    token1: string,
    debtTokenForToken1: BigNumber,
    token1FromDebtToken: BigNumber,
    pathFromDebtTokenToToken1: string[],
    usePsmForToken1: boolean,
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
    lendingPool: string,
): string => {

    const operationData = ethers.utils.defaultAbiCoder.encode([
        asTupple([
            'address',
            'address',
            'address',
            'address',
            'address',
            'uint256',
            'uint256',
            'address[]',
            'bool',
            'address',
            'uint256',
            'uint256',
            'address[]',
            'bool',
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
            'address',
        ])
    ],[
        [
            sender,
            debtToken,
            router02,
            psm,
            token0,
            debtTokenForToken0,
            token0FromDebtToken,
            pathFromDebtTokenToToken0,
            usePsmForToken0,
            token1,
            debtTokenForToken1,
            token1FromDebtToken,
            pathFromDebtTokenToToken1,
            usePsmForToken1,
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
            lendingPool,
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

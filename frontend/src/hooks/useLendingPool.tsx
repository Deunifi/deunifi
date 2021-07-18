import { BigNumber } from "@ethersproject/bignumber";
import { Contract, ethers } from "ethers";
import { formatUnits, parseUnits } from "ethers/lib/utils";
import { useState } from "react";
import { useContract } from "../components/Deployments";
import { useEffectAutoCancel } from "./useEffectAutoCancel";

type LoanFeeCalculationFunction = (amount: BigNumber) => BigNumber
const zeroFunction: LoanFeeCalculationFunction = () => ethers.constants.Zero

interface AccountInfo {
    owner: string,
    number: BigNumber,
}

enum ActionType{
    Deposit = 0, // supply tokens
    Withdraw, // borrow tokens
    Transfer, // transfer balance between accounts
    Buy, // buy an amount of some token (externally)
    Sell, // sell an amount of some token (externally)
    Trade, // trade tokens against another account
    Liquidate, // liquidate an undercollateralized or expiring account
    Vaporize, // use excess tokens to zero-out a completely negative account
    Call // send arbitrary data to an address
}

enum AssetDenomination {
    Wei = 0, // the amount is denominated in wei
    Par // the amount is denominated in par
}

enum AssetReference {
    Delta=0, // the amount is given as a delta from the current value
    Target // the amount is given as an exact number to end up at
}

interface AssetAmount {
    sign: boolean, // true if positive
    denomination: AssetDenomination,
    ref: AssetReference,
    value: BigNumber,
}

interface AccountInfo {
    owner: string,
    number: BigNumber
}

interface ActionArgs {
    actionType: ActionType,
    accountId: BigNumber,
    amount: AssetAmount,
    primaryMarketId: BigNumber,
    secondaryMarketId: BigNumber,
    otherAddress: string,
    otherAccountId: BigNumber,
    data: string | [],
}

type FlashLoanOperation = ActionArgs[]

interface ILendingPool{
    useDyDx: boolean,
    setUseDyDx: React.Dispatch<React.SetStateAction<boolean>>,
    contract?: Contract,
    getLoanFee: LoanFeeCalculationFunction,
    loanFeeRatio: BigNumber, // 18 decimals
    useAave: boolean,
    getAccountInfos: (address: string) => AccountInfo[], // Account.Info[] memory accountInfos
    getFlashLoanOperations: (loanAmmount: BigNumber, callbackData: string, address: string) => FlashLoanOperation, // Actions.ActionArgs[] memory actions,
}

const _getWithdrawAction = (marketId: BigNumber, amount: BigNumber, otherAddress: string): ActionArgs => 
{
    return {
            actionType: ActionType.Withdraw,
            accountId: ethers.constants.Zero,
            amount: {
                sign: false,
                denomination: AssetDenomination.Wei,
                ref: AssetReference.Delta,
                value: amount
            },
            primaryMarketId: marketId,
            secondaryMarketId: ethers.constants.Zero,
            otherAddress: otherAddress, //TODO address(this)
            otherAccountId: ethers.constants.Zero,
            data: []
        };
}

const _getCallAction = (data: string, otherAddress: string): ActionArgs => {
    return {
        actionType: ActionType.Call,
        accountId: ethers.constants.Zero,
        amount: {
            sign: false,
            denomination: AssetDenomination.Wei,
            ref: AssetReference.Delta,
            value: ethers.constants.Zero,
        },
        primaryMarketId: ethers.constants.Zero,
        secondaryMarketId: ethers.constants.Zero,
        otherAddress: otherAddress, //TODO address(this)
        otherAccountId: ethers.constants.Zero,
        data: data
    };
}

const _getDepositAction = (marketId: BigNumber, amount: BigNumber, otherAddress: string): ActionArgs => {
    return {
            actionType: ActionType.Deposit,
            accountId: ethers.constants.Zero,
            amount: {
                sign: true,
                denomination: AssetDenomination.Wei,
                ref: AssetReference.Delta,
                value: amount
            },
            primaryMarketId: marketId,
            secondaryMarketId: ethers.constants.Zero,
            otherAddress: otherAddress,
            otherAccountId: ethers.constants.Zero,
            data: []
        };
}

const _getRepaymentAmountInternal = (amount: BigNumber): BigNumber => amount.add(2)

const initialLendingPool: ILendingPool = {
    useDyDx: true,
    setUseDyDx: () => {},
    getLoanFee: zeroFunction,
    loanFeeRatio: ethers.constants.Zero,
    useAave: true,
    getAccountInfos: (address: string): AccountInfo[] => {
        return [
            {
                owner: address,
                number: ethers.constants.One
            }
        ]
    },
    getFlashLoanOperations: () => [],
}

const _getMarketIdFromTokenAddress = async (solo: Contract, token: Contract): Promise<BigNumber> => {

    const numMarkets = await solo.getNumMarkets();

    for (let i = 0; i < numMarkets; i++) {

        const curToken = await solo.getMarketTokenAddress(i);

        if (curToken == token.address) {
            return BigNumber.from(i);
        }
    }

    throw Error(`No marketId found for token ${token.address}`);
}

export const useLendingPool = () => {

    const [ useDyDx, setUseDyDx ] = useState(true)
    const lendingPoolAddressesProvider = useContract('LendingPoolAddressesProvider')
    const lendingPoolContract = useContract('LendingPool')
    const dssFlash = useContract('DssFlash')
    const soloMargin = useContract('SoloMargin')
    const dai = useContract('Dai')

    const [lendingPoolState, setLendingPoolState] = useState<ILendingPool>(initialLendingPool)

    useEffectAutoCancel(function* (){

        if (useDyDx)
            return

        const lendingPool = {...initialLendingPool, setUseDyDx, useDyDx }
        
        if (!lendingPoolAddressesProvider || !lendingPoolContract || !dssFlash){
            setLendingPoolState(lendingPool)
            return
        }

        const aaveLendingPoolAddressPromise = lendingPoolAddressesProvider.getLendingPool()

        const makerFeeRatioPromise = dssFlash.toll()

        const aaveLendingPoolContract = lendingPoolContract.attach((yield aaveLendingPoolAddressPromise) as string)
        const aaveFeeRatio = ((yield aaveLendingPoolContract.FLASHLOAN_PREMIUM_TOTAL()) as BigNumber).mul(parseUnits('1',14))
        const makerFeeRatio = ((yield makerFeeRatioPromise) as BigNumber)

        if (makerFeeRatio.lt(aaveFeeRatio)){
            lendingPool.contract = dssFlash
            lendingPool.loanFeeRatio = makerFeeRatio
            lendingPool.useAave = false
        } else {
            lendingPool.contract = aaveLendingPoolContract
            lendingPool.loanFeeRatio = aaveFeeRatio
            lendingPool.useAave = true
        }

        lendingPool.getLoanFee = (amount: BigNumber) => amount.mul(lendingPool.loanFeeRatio).div(ethers.constants.WeiPerEther)

        setLendingPoolState(lendingPool)

    }, [lendingPoolAddressesProvider, lendingPoolContract, dssFlash, soloMargin, dai, useDyDx])

    useEffectAutoCancel(function* (){

        if (!useDyDx)
            return

        const lendingPool = {...initialLendingPool, setUseDyDx, useDyDx}
        
        if (!soloMargin || !dai){
            setLendingPoolState(lendingPool)
            return
        }

        const marketIdPromise = _getMarketIdFromTokenAddress(soloMargin, dai)
        const marketId = (yield marketIdPromise) as BigNumber

        lendingPool.contract = soloMargin
        lendingPool.loanFeeRatio = ethers.constants.Zero
        lendingPool.useAave = false
        lendingPool.getLoanFee = (amount: BigNumber) => amount.isZero() ? ethers.constants.Zero : BigNumber.from(2)
        lendingPool.getFlashLoanOperations = (loanAmmount: BigNumber, callbackData: string, address: string) => {

            return [
                _getWithdrawAction(marketId, loanAmmount, address),
    
                _getCallAction(
                    callbackData,
                    address
                ),
    
                _getDepositAction(marketId, _getRepaymentAmountInternal(loanAmmount), address)
            ]
        }

        setLendingPoolState(lendingPool)

    }, [soloMargin, dai, useDyDx])

    return lendingPoolState

}

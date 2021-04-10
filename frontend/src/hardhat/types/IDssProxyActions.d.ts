/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */

import {
  ethers,
  EventFilter,
  Signer,
  BigNumber,
  BigNumberish,
  PopulatedTransaction,
  Contract,
  ContractTransaction,
  Overrides,
  CallOverrides,
} from "ethers";
import { BytesLike } from "@ethersproject/bytes";
import { Listener, Provider } from "@ethersproject/providers";
import { FunctionFragment, EventFragment, Result } from "@ethersproject/abi";
import { TypedEventFilter, TypedEvent, TypedListener } from "./commons";

interface IDssProxyActionsInterface extends ethers.utils.Interface {
  functions: {
    "lockGemAndDraw(address,address,address,address,uint256,uint256,uint256,bool)": FunctionFragment;
    "wipeAndFreeGem(address,address,address,uint256,uint256,uint256)": FunctionFragment;
  };

  encodeFunctionData(
    functionFragment: "lockGemAndDraw",
    values: [
      string,
      string,
      string,
      string,
      BigNumberish,
      BigNumberish,
      BigNumberish,
      boolean
    ]
  ): string;
  encodeFunctionData(
    functionFragment: "wipeAndFreeGem",
    values: [string, string, string, BigNumberish, BigNumberish, BigNumberish]
  ): string;

  decodeFunctionResult(
    functionFragment: "lockGemAndDraw",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "wipeAndFreeGem",
    data: BytesLike
  ): Result;

  events: {};
}

export class IDssProxyActions extends Contract {
  connect(signerOrProvider: Signer | Provider | string): this;
  attach(addressOrName: string): this;
  deployed(): Promise<this>;

  listeners<EventArgsArray extends Array<any>, EventArgsObject>(
    eventFilter?: TypedEventFilter<EventArgsArray, EventArgsObject>
  ): Array<TypedListener<EventArgsArray, EventArgsObject>>;
  off<EventArgsArray extends Array<any>, EventArgsObject>(
    eventFilter: TypedEventFilter<EventArgsArray, EventArgsObject>,
    listener: TypedListener<EventArgsArray, EventArgsObject>
  ): this;
  on<EventArgsArray extends Array<any>, EventArgsObject>(
    eventFilter: TypedEventFilter<EventArgsArray, EventArgsObject>,
    listener: TypedListener<EventArgsArray, EventArgsObject>
  ): this;
  once<EventArgsArray extends Array<any>, EventArgsObject>(
    eventFilter: TypedEventFilter<EventArgsArray, EventArgsObject>,
    listener: TypedListener<EventArgsArray, EventArgsObject>
  ): this;
  removeListener<EventArgsArray extends Array<any>, EventArgsObject>(
    eventFilter: TypedEventFilter<EventArgsArray, EventArgsObject>,
    listener: TypedListener<EventArgsArray, EventArgsObject>
  ): this;
  removeAllListeners<EventArgsArray extends Array<any>, EventArgsObject>(
    eventFilter: TypedEventFilter<EventArgsArray, EventArgsObject>
  ): this;

  listeners(eventName?: string): Array<Listener>;
  off(eventName: string, listener: Listener): this;
  on(eventName: string, listener: Listener): this;
  once(eventName: string, listener: Listener): this;
  removeListener(eventName: string, listener: Listener): this;
  removeAllListeners(eventName?: string): this;

  queryFilter<EventArgsArray extends Array<any>, EventArgsObject>(
    event: TypedEventFilter<EventArgsArray, EventArgsObject>,
    fromBlockOrBlockhash?: string | number | undefined,
    toBlock?: string | number | undefined
  ): Promise<Array<TypedEvent<EventArgsArray & EventArgsObject>>>;

  interface: IDssProxyActionsInterface;

  functions: {
    lockGemAndDraw(
      manager: string,
      jug: string,
      gemJoin: string,
      daiJoin: string,
      cdp: BigNumberish,
      wadC: BigNumberish,
      wadD: BigNumberish,
      transferFrom: boolean,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<ContractTransaction>;

    "lockGemAndDraw(address,address,address,address,uint256,uint256,uint256,bool)"(
      manager: string,
      jug: string,
      gemJoin: string,
      daiJoin: string,
      cdp: BigNumberish,
      wadC: BigNumberish,
      wadD: BigNumberish,
      transferFrom: boolean,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<ContractTransaction>;

    wipeAndFreeGem(
      manager: string,
      gemJoin: string,
      daiJoin: string,
      cdp: BigNumberish,
      wadC: BigNumberish,
      wadD: BigNumberish,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<ContractTransaction>;

    "wipeAndFreeGem(address,address,address,uint256,uint256,uint256)"(
      manager: string,
      gemJoin: string,
      daiJoin: string,
      cdp: BigNumberish,
      wadC: BigNumberish,
      wadD: BigNumberish,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<ContractTransaction>;
  };

  lockGemAndDraw(
    manager: string,
    jug: string,
    gemJoin: string,
    daiJoin: string,
    cdp: BigNumberish,
    wadC: BigNumberish,
    wadD: BigNumberish,
    transferFrom: boolean,
    overrides?: Overrides & { from?: string | Promise<string> }
  ): Promise<ContractTransaction>;

  "lockGemAndDraw(address,address,address,address,uint256,uint256,uint256,bool)"(
    manager: string,
    jug: string,
    gemJoin: string,
    daiJoin: string,
    cdp: BigNumberish,
    wadC: BigNumberish,
    wadD: BigNumberish,
    transferFrom: boolean,
    overrides?: Overrides & { from?: string | Promise<string> }
  ): Promise<ContractTransaction>;

  wipeAndFreeGem(
    manager: string,
    gemJoin: string,
    daiJoin: string,
    cdp: BigNumberish,
    wadC: BigNumberish,
    wadD: BigNumberish,
    overrides?: Overrides & { from?: string | Promise<string> }
  ): Promise<ContractTransaction>;

  "wipeAndFreeGem(address,address,address,uint256,uint256,uint256)"(
    manager: string,
    gemJoin: string,
    daiJoin: string,
    cdp: BigNumberish,
    wadC: BigNumberish,
    wadD: BigNumberish,
    overrides?: Overrides & { from?: string | Promise<string> }
  ): Promise<ContractTransaction>;

  callStatic: {
    lockGemAndDraw(
      manager: string,
      jug: string,
      gemJoin: string,
      daiJoin: string,
      cdp: BigNumberish,
      wadC: BigNumberish,
      wadD: BigNumberish,
      transferFrom: boolean,
      overrides?: CallOverrides
    ): Promise<void>;

    "lockGemAndDraw(address,address,address,address,uint256,uint256,uint256,bool)"(
      manager: string,
      jug: string,
      gemJoin: string,
      daiJoin: string,
      cdp: BigNumberish,
      wadC: BigNumberish,
      wadD: BigNumberish,
      transferFrom: boolean,
      overrides?: CallOverrides
    ): Promise<void>;

    wipeAndFreeGem(
      manager: string,
      gemJoin: string,
      daiJoin: string,
      cdp: BigNumberish,
      wadC: BigNumberish,
      wadD: BigNumberish,
      overrides?: CallOverrides
    ): Promise<void>;

    "wipeAndFreeGem(address,address,address,uint256,uint256,uint256)"(
      manager: string,
      gemJoin: string,
      daiJoin: string,
      cdp: BigNumberish,
      wadC: BigNumberish,
      wadD: BigNumberish,
      overrides?: CallOverrides
    ): Promise<void>;
  };

  filters: {};

  estimateGas: {
    lockGemAndDraw(
      manager: string,
      jug: string,
      gemJoin: string,
      daiJoin: string,
      cdp: BigNumberish,
      wadC: BigNumberish,
      wadD: BigNumberish,
      transferFrom: boolean,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<BigNumber>;

    "lockGemAndDraw(address,address,address,address,uint256,uint256,uint256,bool)"(
      manager: string,
      jug: string,
      gemJoin: string,
      daiJoin: string,
      cdp: BigNumberish,
      wadC: BigNumberish,
      wadD: BigNumberish,
      transferFrom: boolean,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<BigNumber>;

    wipeAndFreeGem(
      manager: string,
      gemJoin: string,
      daiJoin: string,
      cdp: BigNumberish,
      wadC: BigNumberish,
      wadD: BigNumberish,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<BigNumber>;

    "wipeAndFreeGem(address,address,address,uint256,uint256,uint256)"(
      manager: string,
      gemJoin: string,
      daiJoin: string,
      cdp: BigNumberish,
      wadC: BigNumberish,
      wadD: BigNumberish,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<BigNumber>;
  };

  populateTransaction: {
    lockGemAndDraw(
      manager: string,
      jug: string,
      gemJoin: string,
      daiJoin: string,
      cdp: BigNumberish,
      wadC: BigNumberish,
      wadD: BigNumberish,
      transferFrom: boolean,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<PopulatedTransaction>;

    "lockGemAndDraw(address,address,address,address,uint256,uint256,uint256,bool)"(
      manager: string,
      jug: string,
      gemJoin: string,
      daiJoin: string,
      cdp: BigNumberish,
      wadC: BigNumberish,
      wadD: BigNumberish,
      transferFrom: boolean,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<PopulatedTransaction>;

    wipeAndFreeGem(
      manager: string,
      gemJoin: string,
      daiJoin: string,
      cdp: BigNumberish,
      wadC: BigNumberish,
      wadD: BigNumberish,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<PopulatedTransaction>;

    "wipeAndFreeGem(address,address,address,uint256,uint256,uint256)"(
      manager: string,
      gemJoin: string,
      daiJoin: string,
      cdp: BigNumberish,
      wadC: BigNumberish,
      wadD: BigNumberish,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<PopulatedTransaction>;
  };
}
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

interface ILendingPoolAddressesProviderInterface
  extends ethers.utils.Interface {
  functions: {
    "getAddress(bytes32)": FunctionFragment;
    "getEmergencyAdmin()": FunctionFragment;
    "getLendingPool()": FunctionFragment;
    "getLendingPoolCollateralManager()": FunctionFragment;
    "getLendingPoolConfigurator()": FunctionFragment;
    "getLendingRateOracle()": FunctionFragment;
    "getPoolAdmin()": FunctionFragment;
    "getPriceOracle()": FunctionFragment;
    "setAddress(bytes32,address)": FunctionFragment;
    "setAddressAsProxy(bytes32,address)": FunctionFragment;
    "setEmergencyAdmin(address)": FunctionFragment;
    "setLendingPoolCollateralManager(address)": FunctionFragment;
    "setLendingPoolConfiguratorImpl(address)": FunctionFragment;
    "setLendingPoolImpl(address)": FunctionFragment;
    "setLendingRateOracle(address)": FunctionFragment;
    "setPoolAdmin(address)": FunctionFragment;
    "setPriceOracle(address)": FunctionFragment;
  };

  encodeFunctionData(
    functionFragment: "getAddress",
    values: [BytesLike]
  ): string;
  encodeFunctionData(
    functionFragment: "getEmergencyAdmin",
    values?: undefined
  ): string;
  encodeFunctionData(
    functionFragment: "getLendingPool",
    values?: undefined
  ): string;
  encodeFunctionData(
    functionFragment: "getLendingPoolCollateralManager",
    values?: undefined
  ): string;
  encodeFunctionData(
    functionFragment: "getLendingPoolConfigurator",
    values?: undefined
  ): string;
  encodeFunctionData(
    functionFragment: "getLendingRateOracle",
    values?: undefined
  ): string;
  encodeFunctionData(
    functionFragment: "getPoolAdmin",
    values?: undefined
  ): string;
  encodeFunctionData(
    functionFragment: "getPriceOracle",
    values?: undefined
  ): string;
  encodeFunctionData(
    functionFragment: "setAddress",
    values: [BytesLike, string]
  ): string;
  encodeFunctionData(
    functionFragment: "setAddressAsProxy",
    values: [BytesLike, string]
  ): string;
  encodeFunctionData(
    functionFragment: "setEmergencyAdmin",
    values: [string]
  ): string;
  encodeFunctionData(
    functionFragment: "setLendingPoolCollateralManager",
    values: [string]
  ): string;
  encodeFunctionData(
    functionFragment: "setLendingPoolConfiguratorImpl",
    values: [string]
  ): string;
  encodeFunctionData(
    functionFragment: "setLendingPoolImpl",
    values: [string]
  ): string;
  encodeFunctionData(
    functionFragment: "setLendingRateOracle",
    values: [string]
  ): string;
  encodeFunctionData(
    functionFragment: "setPoolAdmin",
    values: [string]
  ): string;
  encodeFunctionData(
    functionFragment: "setPriceOracle",
    values: [string]
  ): string;

  decodeFunctionResult(functionFragment: "getAddress", data: BytesLike): Result;
  decodeFunctionResult(
    functionFragment: "getEmergencyAdmin",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "getLendingPool",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "getLendingPoolCollateralManager",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "getLendingPoolConfigurator",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "getLendingRateOracle",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "getPoolAdmin",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "getPriceOracle",
    data: BytesLike
  ): Result;
  decodeFunctionResult(functionFragment: "setAddress", data: BytesLike): Result;
  decodeFunctionResult(
    functionFragment: "setAddressAsProxy",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "setEmergencyAdmin",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "setLendingPoolCollateralManager",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "setLendingPoolConfiguratorImpl",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "setLendingPoolImpl",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "setLendingRateOracle",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "setPoolAdmin",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "setPriceOracle",
    data: BytesLike
  ): Result;

  events: {
    "AddressSet(bytes32,address,bool)": EventFragment;
    "ConfigurationAdminUpdated(address)": EventFragment;
    "EmergencyAdminUpdated(address)": EventFragment;
    "LendingPoolCollateralManagerUpdated(address)": EventFragment;
    "LendingPoolConfiguratorUpdated(address)": EventFragment;
    "LendingPoolUpdated(address)": EventFragment;
    "LendingRateOracleUpdated(address)": EventFragment;
    "PriceOracleUpdated(address)": EventFragment;
    "ProxyCreated(bytes32,address)": EventFragment;
  };

  getEvent(nameOrSignatureOrTopic: "AddressSet"): EventFragment;
  getEvent(nameOrSignatureOrTopic: "ConfigurationAdminUpdated"): EventFragment;
  getEvent(nameOrSignatureOrTopic: "EmergencyAdminUpdated"): EventFragment;
  getEvent(
    nameOrSignatureOrTopic: "LendingPoolCollateralManagerUpdated"
  ): EventFragment;
  getEvent(
    nameOrSignatureOrTopic: "LendingPoolConfiguratorUpdated"
  ): EventFragment;
  getEvent(nameOrSignatureOrTopic: "LendingPoolUpdated"): EventFragment;
  getEvent(nameOrSignatureOrTopic: "LendingRateOracleUpdated"): EventFragment;
  getEvent(nameOrSignatureOrTopic: "PriceOracleUpdated"): EventFragment;
  getEvent(nameOrSignatureOrTopic: "ProxyCreated"): EventFragment;
}

export class ILendingPoolAddressesProvider extends Contract {
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

  interface: ILendingPoolAddressesProviderInterface;

  functions: {
    getAddress(id: BytesLike, overrides?: CallOverrides): Promise<[string]>;

    "getAddress(bytes32)"(
      id: BytesLike,
      overrides?: CallOverrides
    ): Promise<[string]>;

    getEmergencyAdmin(overrides?: CallOverrides): Promise<[string]>;

    "getEmergencyAdmin()"(overrides?: CallOverrides): Promise<[string]>;

    getLendingPool(overrides?: CallOverrides): Promise<[string]>;

    "getLendingPool()"(overrides?: CallOverrides): Promise<[string]>;

    getLendingPoolCollateralManager(
      overrides?: CallOverrides
    ): Promise<[string]>;

    "getLendingPoolCollateralManager()"(
      overrides?: CallOverrides
    ): Promise<[string]>;

    getLendingPoolConfigurator(overrides?: CallOverrides): Promise<[string]>;

    "getLendingPoolConfigurator()"(
      overrides?: CallOverrides
    ): Promise<[string]>;

    getLendingRateOracle(overrides?: CallOverrides): Promise<[string]>;

    "getLendingRateOracle()"(overrides?: CallOverrides): Promise<[string]>;

    getPoolAdmin(overrides?: CallOverrides): Promise<[string]>;

    "getPoolAdmin()"(overrides?: CallOverrides): Promise<[string]>;

    getPriceOracle(overrides?: CallOverrides): Promise<[string]>;

    "getPriceOracle()"(overrides?: CallOverrides): Promise<[string]>;

    setAddress(
      id: BytesLike,
      newAddress: string,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<ContractTransaction>;

    "setAddress(bytes32,address)"(
      id: BytesLike,
      newAddress: string,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<ContractTransaction>;

    setAddressAsProxy(
      id: BytesLike,
      impl: string,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<ContractTransaction>;

    "setAddressAsProxy(bytes32,address)"(
      id: BytesLike,
      impl: string,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<ContractTransaction>;

    setEmergencyAdmin(
      admin: string,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<ContractTransaction>;

    "setEmergencyAdmin(address)"(
      admin: string,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<ContractTransaction>;

    setLendingPoolCollateralManager(
      manager: string,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<ContractTransaction>;

    "setLendingPoolCollateralManager(address)"(
      manager: string,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<ContractTransaction>;

    setLendingPoolConfiguratorImpl(
      configurator: string,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<ContractTransaction>;

    "setLendingPoolConfiguratorImpl(address)"(
      configurator: string,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<ContractTransaction>;

    setLendingPoolImpl(
      pool: string,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<ContractTransaction>;

    "setLendingPoolImpl(address)"(
      pool: string,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<ContractTransaction>;

    setLendingRateOracle(
      lendingRateOracle: string,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<ContractTransaction>;

    "setLendingRateOracle(address)"(
      lendingRateOracle: string,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<ContractTransaction>;

    setPoolAdmin(
      admin: string,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<ContractTransaction>;

    "setPoolAdmin(address)"(
      admin: string,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<ContractTransaction>;

    setPriceOracle(
      priceOracle: string,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<ContractTransaction>;

    "setPriceOracle(address)"(
      priceOracle: string,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<ContractTransaction>;
  };

  getAddress(id: BytesLike, overrides?: CallOverrides): Promise<string>;

  "getAddress(bytes32)"(
    id: BytesLike,
    overrides?: CallOverrides
  ): Promise<string>;

  getEmergencyAdmin(overrides?: CallOverrides): Promise<string>;

  "getEmergencyAdmin()"(overrides?: CallOverrides): Promise<string>;

  getLendingPool(overrides?: CallOverrides): Promise<string>;

  "getLendingPool()"(overrides?: CallOverrides): Promise<string>;

  getLendingPoolCollateralManager(overrides?: CallOverrides): Promise<string>;

  "getLendingPoolCollateralManager()"(
    overrides?: CallOverrides
  ): Promise<string>;

  getLendingPoolConfigurator(overrides?: CallOverrides): Promise<string>;

  "getLendingPoolConfigurator()"(overrides?: CallOverrides): Promise<string>;

  getLendingRateOracle(overrides?: CallOverrides): Promise<string>;

  "getLendingRateOracle()"(overrides?: CallOverrides): Promise<string>;

  getPoolAdmin(overrides?: CallOverrides): Promise<string>;

  "getPoolAdmin()"(overrides?: CallOverrides): Promise<string>;

  getPriceOracle(overrides?: CallOverrides): Promise<string>;

  "getPriceOracle()"(overrides?: CallOverrides): Promise<string>;

  setAddress(
    id: BytesLike,
    newAddress: string,
    overrides?: Overrides & { from?: string | Promise<string> }
  ): Promise<ContractTransaction>;

  "setAddress(bytes32,address)"(
    id: BytesLike,
    newAddress: string,
    overrides?: Overrides & { from?: string | Promise<string> }
  ): Promise<ContractTransaction>;

  setAddressAsProxy(
    id: BytesLike,
    impl: string,
    overrides?: Overrides & { from?: string | Promise<string> }
  ): Promise<ContractTransaction>;

  "setAddressAsProxy(bytes32,address)"(
    id: BytesLike,
    impl: string,
    overrides?: Overrides & { from?: string | Promise<string> }
  ): Promise<ContractTransaction>;

  setEmergencyAdmin(
    admin: string,
    overrides?: Overrides & { from?: string | Promise<string> }
  ): Promise<ContractTransaction>;

  "setEmergencyAdmin(address)"(
    admin: string,
    overrides?: Overrides & { from?: string | Promise<string> }
  ): Promise<ContractTransaction>;

  setLendingPoolCollateralManager(
    manager: string,
    overrides?: Overrides & { from?: string | Promise<string> }
  ): Promise<ContractTransaction>;

  "setLendingPoolCollateralManager(address)"(
    manager: string,
    overrides?: Overrides & { from?: string | Promise<string> }
  ): Promise<ContractTransaction>;

  setLendingPoolConfiguratorImpl(
    configurator: string,
    overrides?: Overrides & { from?: string | Promise<string> }
  ): Promise<ContractTransaction>;

  "setLendingPoolConfiguratorImpl(address)"(
    configurator: string,
    overrides?: Overrides & { from?: string | Promise<string> }
  ): Promise<ContractTransaction>;

  setLendingPoolImpl(
    pool: string,
    overrides?: Overrides & { from?: string | Promise<string> }
  ): Promise<ContractTransaction>;

  "setLendingPoolImpl(address)"(
    pool: string,
    overrides?: Overrides & { from?: string | Promise<string> }
  ): Promise<ContractTransaction>;

  setLendingRateOracle(
    lendingRateOracle: string,
    overrides?: Overrides & { from?: string | Promise<string> }
  ): Promise<ContractTransaction>;

  "setLendingRateOracle(address)"(
    lendingRateOracle: string,
    overrides?: Overrides & { from?: string | Promise<string> }
  ): Promise<ContractTransaction>;

  setPoolAdmin(
    admin: string,
    overrides?: Overrides & { from?: string | Promise<string> }
  ): Promise<ContractTransaction>;

  "setPoolAdmin(address)"(
    admin: string,
    overrides?: Overrides & { from?: string | Promise<string> }
  ): Promise<ContractTransaction>;

  setPriceOracle(
    priceOracle: string,
    overrides?: Overrides & { from?: string | Promise<string> }
  ): Promise<ContractTransaction>;

  "setPriceOracle(address)"(
    priceOracle: string,
    overrides?: Overrides & { from?: string | Promise<string> }
  ): Promise<ContractTransaction>;

  callStatic: {
    getAddress(id: BytesLike, overrides?: CallOverrides): Promise<string>;

    "getAddress(bytes32)"(
      id: BytesLike,
      overrides?: CallOverrides
    ): Promise<string>;

    getEmergencyAdmin(overrides?: CallOverrides): Promise<string>;

    "getEmergencyAdmin()"(overrides?: CallOverrides): Promise<string>;

    getLendingPool(overrides?: CallOverrides): Promise<string>;

    "getLendingPool()"(overrides?: CallOverrides): Promise<string>;

    getLendingPoolCollateralManager(overrides?: CallOverrides): Promise<string>;

    "getLendingPoolCollateralManager()"(
      overrides?: CallOverrides
    ): Promise<string>;

    getLendingPoolConfigurator(overrides?: CallOverrides): Promise<string>;

    "getLendingPoolConfigurator()"(overrides?: CallOverrides): Promise<string>;

    getLendingRateOracle(overrides?: CallOverrides): Promise<string>;

    "getLendingRateOracle()"(overrides?: CallOverrides): Promise<string>;

    getPoolAdmin(overrides?: CallOverrides): Promise<string>;

    "getPoolAdmin()"(overrides?: CallOverrides): Promise<string>;

    getPriceOracle(overrides?: CallOverrides): Promise<string>;

    "getPriceOracle()"(overrides?: CallOverrides): Promise<string>;

    setAddress(
      id: BytesLike,
      newAddress: string,
      overrides?: CallOverrides
    ): Promise<void>;

    "setAddress(bytes32,address)"(
      id: BytesLike,
      newAddress: string,
      overrides?: CallOverrides
    ): Promise<void>;

    setAddressAsProxy(
      id: BytesLike,
      impl: string,
      overrides?: CallOverrides
    ): Promise<void>;

    "setAddressAsProxy(bytes32,address)"(
      id: BytesLike,
      impl: string,
      overrides?: CallOverrides
    ): Promise<void>;

    setEmergencyAdmin(admin: string, overrides?: CallOverrides): Promise<void>;

    "setEmergencyAdmin(address)"(
      admin: string,
      overrides?: CallOverrides
    ): Promise<void>;

    setLendingPoolCollateralManager(
      manager: string,
      overrides?: CallOverrides
    ): Promise<void>;

    "setLendingPoolCollateralManager(address)"(
      manager: string,
      overrides?: CallOverrides
    ): Promise<void>;

    setLendingPoolConfiguratorImpl(
      configurator: string,
      overrides?: CallOverrides
    ): Promise<void>;

    "setLendingPoolConfiguratorImpl(address)"(
      configurator: string,
      overrides?: CallOverrides
    ): Promise<void>;

    setLendingPoolImpl(pool: string, overrides?: CallOverrides): Promise<void>;

    "setLendingPoolImpl(address)"(
      pool: string,
      overrides?: CallOverrides
    ): Promise<void>;

    setLendingRateOracle(
      lendingRateOracle: string,
      overrides?: CallOverrides
    ): Promise<void>;

    "setLendingRateOracle(address)"(
      lendingRateOracle: string,
      overrides?: CallOverrides
    ): Promise<void>;

    setPoolAdmin(admin: string, overrides?: CallOverrides): Promise<void>;

    "setPoolAdmin(address)"(
      admin: string,
      overrides?: CallOverrides
    ): Promise<void>;

    setPriceOracle(
      priceOracle: string,
      overrides?: CallOverrides
    ): Promise<void>;

    "setPriceOracle(address)"(
      priceOracle: string,
      overrides?: CallOverrides
    ): Promise<void>;
  };

  filters: {
    AddressSet(
      id: null,
      newAddress: string | null,
      hasProxy: null
    ): TypedEventFilter<
      [string, string, boolean],
      { id: string; newAddress: string; hasProxy: boolean }
    >;

    ConfigurationAdminUpdated(
      newAddress: string | null
    ): TypedEventFilter<[string], { newAddress: string }>;

    EmergencyAdminUpdated(
      newAddress: string | null
    ): TypedEventFilter<[string], { newAddress: string }>;

    LendingPoolCollateralManagerUpdated(
      newAddress: string | null
    ): TypedEventFilter<[string], { newAddress: string }>;

    LendingPoolConfiguratorUpdated(
      newAddress: string | null
    ): TypedEventFilter<[string], { newAddress: string }>;

    LendingPoolUpdated(
      newAddress: string | null
    ): TypedEventFilter<[string], { newAddress: string }>;

    LendingRateOracleUpdated(
      newAddress: string | null
    ): TypedEventFilter<[string], { newAddress: string }>;

    PriceOracleUpdated(
      newAddress: string | null
    ): TypedEventFilter<[string], { newAddress: string }>;

    ProxyCreated(
      id: null,
      newAddress: string | null
    ): TypedEventFilter<[string, string], { id: string; newAddress: string }>;
  };

  estimateGas: {
    getAddress(id: BytesLike, overrides?: CallOverrides): Promise<BigNumber>;

    "getAddress(bytes32)"(
      id: BytesLike,
      overrides?: CallOverrides
    ): Promise<BigNumber>;

    getEmergencyAdmin(overrides?: CallOverrides): Promise<BigNumber>;

    "getEmergencyAdmin()"(overrides?: CallOverrides): Promise<BigNumber>;

    getLendingPool(overrides?: CallOverrides): Promise<BigNumber>;

    "getLendingPool()"(overrides?: CallOverrides): Promise<BigNumber>;

    getLendingPoolCollateralManager(
      overrides?: CallOverrides
    ): Promise<BigNumber>;

    "getLendingPoolCollateralManager()"(
      overrides?: CallOverrides
    ): Promise<BigNumber>;

    getLendingPoolConfigurator(overrides?: CallOverrides): Promise<BigNumber>;

    "getLendingPoolConfigurator()"(
      overrides?: CallOverrides
    ): Promise<BigNumber>;

    getLendingRateOracle(overrides?: CallOverrides): Promise<BigNumber>;

    "getLendingRateOracle()"(overrides?: CallOverrides): Promise<BigNumber>;

    getPoolAdmin(overrides?: CallOverrides): Promise<BigNumber>;

    "getPoolAdmin()"(overrides?: CallOverrides): Promise<BigNumber>;

    getPriceOracle(overrides?: CallOverrides): Promise<BigNumber>;

    "getPriceOracle()"(overrides?: CallOverrides): Promise<BigNumber>;

    setAddress(
      id: BytesLike,
      newAddress: string,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<BigNumber>;

    "setAddress(bytes32,address)"(
      id: BytesLike,
      newAddress: string,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<BigNumber>;

    setAddressAsProxy(
      id: BytesLike,
      impl: string,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<BigNumber>;

    "setAddressAsProxy(bytes32,address)"(
      id: BytesLike,
      impl: string,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<BigNumber>;

    setEmergencyAdmin(
      admin: string,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<BigNumber>;

    "setEmergencyAdmin(address)"(
      admin: string,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<BigNumber>;

    setLendingPoolCollateralManager(
      manager: string,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<BigNumber>;

    "setLendingPoolCollateralManager(address)"(
      manager: string,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<BigNumber>;

    setLendingPoolConfiguratorImpl(
      configurator: string,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<BigNumber>;

    "setLendingPoolConfiguratorImpl(address)"(
      configurator: string,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<BigNumber>;

    setLendingPoolImpl(
      pool: string,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<BigNumber>;

    "setLendingPoolImpl(address)"(
      pool: string,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<BigNumber>;

    setLendingRateOracle(
      lendingRateOracle: string,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<BigNumber>;

    "setLendingRateOracle(address)"(
      lendingRateOracle: string,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<BigNumber>;

    setPoolAdmin(
      admin: string,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<BigNumber>;

    "setPoolAdmin(address)"(
      admin: string,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<BigNumber>;

    setPriceOracle(
      priceOracle: string,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<BigNumber>;

    "setPriceOracle(address)"(
      priceOracle: string,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<BigNumber>;
  };

  populateTransaction: {
    getAddress(
      id: BytesLike,
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;

    "getAddress(bytes32)"(
      id: BytesLike,
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;

    getEmergencyAdmin(overrides?: CallOverrides): Promise<PopulatedTransaction>;

    "getEmergencyAdmin()"(
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;

    getLendingPool(overrides?: CallOverrides): Promise<PopulatedTransaction>;

    "getLendingPool()"(
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;

    getLendingPoolCollateralManager(
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;

    "getLendingPoolCollateralManager()"(
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;

    getLendingPoolConfigurator(
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;

    "getLendingPoolConfigurator()"(
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;

    getLendingRateOracle(
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;

    "getLendingRateOracle()"(
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;

    getPoolAdmin(overrides?: CallOverrides): Promise<PopulatedTransaction>;

    "getPoolAdmin()"(overrides?: CallOverrides): Promise<PopulatedTransaction>;

    getPriceOracle(overrides?: CallOverrides): Promise<PopulatedTransaction>;

    "getPriceOracle()"(
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;

    setAddress(
      id: BytesLike,
      newAddress: string,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<PopulatedTransaction>;

    "setAddress(bytes32,address)"(
      id: BytesLike,
      newAddress: string,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<PopulatedTransaction>;

    setAddressAsProxy(
      id: BytesLike,
      impl: string,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<PopulatedTransaction>;

    "setAddressAsProxy(bytes32,address)"(
      id: BytesLike,
      impl: string,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<PopulatedTransaction>;

    setEmergencyAdmin(
      admin: string,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<PopulatedTransaction>;

    "setEmergencyAdmin(address)"(
      admin: string,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<PopulatedTransaction>;

    setLendingPoolCollateralManager(
      manager: string,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<PopulatedTransaction>;

    "setLendingPoolCollateralManager(address)"(
      manager: string,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<PopulatedTransaction>;

    setLendingPoolConfiguratorImpl(
      configurator: string,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<PopulatedTransaction>;

    "setLendingPoolConfiguratorImpl(address)"(
      configurator: string,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<PopulatedTransaction>;

    setLendingPoolImpl(
      pool: string,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<PopulatedTransaction>;

    "setLendingPoolImpl(address)"(
      pool: string,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<PopulatedTransaction>;

    setLendingRateOracle(
      lendingRateOracle: string,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<PopulatedTransaction>;

    "setLendingRateOracle(address)"(
      lendingRateOracle: string,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<PopulatedTransaction>;

    setPoolAdmin(
      admin: string,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<PopulatedTransaction>;

    "setPoolAdmin(address)"(
      admin: string,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<PopulatedTransaction>;

    setPriceOracle(
      priceOracle: string,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<PopulatedTransaction>;

    "setPriceOracle(address)"(
      priceOracle: string,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<PopulatedTransaction>;
  };
}

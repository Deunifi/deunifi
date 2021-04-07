/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */

import { Signer, Contract, ContractFactory, Overrides } from "ethers";
import { Provider, TransactionRequest } from "@ethersproject/providers";

import type { Greeter } from "../Greeter";

export class Greeter__factory extends ContractFactory {
  constructor(signer?: Signer) {
    super(_abi, _bytecode, signer);
  }

  deploy(
    _greeting: string,
    overrides?: Overrides & { from?: string | Promise<string> }
  ): Promise<Greeter> {
    return super.deploy(_greeting, overrides || {}) as Promise<Greeter>;
  }
  getDeployTransaction(
    _greeting: string,
    overrides?: Overrides & { from?: string | Promise<string> }
  ): TransactionRequest {
    return super.getDeployTransaction(_greeting, overrides || {});
  }
  attach(address: string): Greeter {
    return super.attach(address) as Greeter;
  }
  connect(signer: Signer): Greeter__factory {
    return super.connect(signer) as Greeter__factory;
  }
  static connect(
    address: string,
    signerOrProvider: Signer | Provider
  ): Greeter {
    return new Contract(address, _abi, signerOrProvider) as Greeter;
  }
}

const _abi = [
  {
    inputs: [
      {
        internalType: "string",
        name: "_greeting",
        type: "string",
      },
    ],
    stateMutability: "nonpayable",
    type: "constructor",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "address",
        name: "sender",
        type: "address",
      },
      {
        indexed: false,
        internalType: "string",
        name: "newGreeting",
        type: "string",
      },
    ],
    name: "GreetingChanged",
    type: "event",
  },
  {
    inputs: [],
    name: "greet",
    outputs: [
      {
        internalType: "string",
        name: "",
        type: "string",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "string",
        name: "_greeting",
        type: "string",
      },
    ],
    name: "setGreeting",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
];

const _bytecode =
  "0x60806040523480156200001157600080fd5b5060405162000bd438038062000bd4833981810160405260208110156200003757600080fd5b81019080805160405193929190846401000000008211156200005857600080fd5b838201915060208201858111156200006f57600080fd5b82518660018202830111640100000000821117156200008d57600080fd5b8083526020830192505050908051906020019080838360005b83811015620000c3578082015181840152602081019050620000a6565b50505050905090810190601f168015620000f15780820380516001836020036101000a031916815260200191505b506040525050506200012860405180606001604052806022815260200162000bb260229139826200014860201b620003ac1760201c565b806000908051906020019062000140929190620002eb565b505062000391565b620002be8282604051602401808060200180602001838103835285818151815260200191508051906020019080838360005b83811015620001975780820151818401526020810190506200017a565b50505050905090810190601f168015620001c55780820380516001836020036101000a031916815260200191505b50838103825284818151815260200191508051906020019080838360005b8381101562000200578082015181840152602081019050620001e3565b50505050905090810190601f1680156200022e5780820380516001836020036101000a031916815260200191505b509450505050506040516020818303038152906040527f4b5c4277000000000000000000000000000000000000000000000000000000007bffffffffffffffffffffffffffffffffffffffffffffffffffffffff19166020820180517bffffffffffffffffffffffffffffffffffffffffffffffffffffffff8381831617835250505050620002c260201b60201c565b5050565b60008151905060006a636f6e736f6c652e6c6f679050602083016000808483855afa5050505050565b828054600181600116156101000203166002900490600052602060002090601f016020900481019282601f106200032e57805160ff19168380011785556200035f565b828001600101855582156200035f579182015b828111156200035e57825182559160200191906001019062000341565b5b5090506200036e919062000372565b5090565b5b808211156200038d57600081600090555060010162000373565b5090565b61081180620003a16000396000f3fe608060405234801561001057600080fd5b50600436106100365760003560e01c8063a41368621461003b578063cfae3217146100f6575b600080fd5b6100f46004803603602081101561005157600080fd5b810190808035906020019064010000000081111561006e57600080fd5b82018360208201111561008057600080fd5b803590602001918460018302840111640100000000831117156100a257600080fd5b91908080601f016020809104026020016040519081016040528093929190818152602001838380828437600081840152601f19601f820116905080830192505050505050509192919290505050610179565b005b6100fe61030a565b6040518080602001828103825283818151815260200191508051906020019080838360005b8381101561013e578082015181840152602081019050610123565b50505050905090810190601f16801561016b5780820380516001836020036101000a031916815260200191505b509250505060405180910390f35b6102366040518060600160405280602381526020016107b96023913960008054600181600116156101000203166002900480601f01602080910402602001604051908101604052809291908181526020018280546001816001161561010002031660029004801561022b5780601f106102005761010080835404028352916020019161022b565b820191906000526020600020905b81548152906001019060200180831161020e57829003601f168201915b505050505083610518565b806000908051906020019061024c92919061071b565b507fea07f7ca8b8b2cfaab1214b6e1459ad859cf1ff2d60a948a1f9c4644970c89503382604051808373ffffffffffffffffffffffffffffffffffffffff16815260200180602001828103825283818151815260200191508051906020019080838360005b838110156102cc5780820151818401526020810190506102b1565b50505050905090810190601f1680156102f95780820380516001836020036101000a031916815260200191505b50935050505060405180910390a150565b606060008054600181600116156101000203166002900480601f0160208091040260200160405190810160405280929190818152602001828054600181600116156101000203166002900480156103a25780601f10610377576101008083540402835291602001916103a2565b820191906000526020600020905b81548152906001019060200180831161038557829003601f168201915b5050505050905090565b6105148282604051602401808060200180602001838103835285818151815260200191508051906020019080838360005b838110156103f85780820151818401526020810190506103dd565b50505050905090810190601f1680156104255780820380516001836020036101000a031916815260200191505b50838103825284818151815260200191508051906020019080838360005b8381101561045e578082015181840152602081019050610443565b50505050905090810190601f16801561048b5780820380516001836020036101000a031916815260200191505b509450505050506040516020818303038152906040527f4b5c4277000000000000000000000000000000000000000000000000000000007bffffffffffffffffffffffffffffffffffffffffffffffffffffffff19166020820180517bffffffffffffffffffffffffffffffffffffffffffffffffffffffff83818316178352505050506106f2565b5050565b6106ed83838360405160240180806020018060200180602001848103845287818151815260200191508051906020019080838360005b8381101561056957808201518184015260208101905061054e565b50505050905090810190601f1680156105965780820380516001836020036101000a031916815260200191505b50848103835286818151815260200191508051906020019080838360005b838110156105cf5780820151818401526020810190506105b4565b50505050905090810190601f1680156105fc5780820380516001836020036101000a031916815260200191505b50848103825285818151815260200191508051906020019080838360005b8381101561063557808201518184015260208101905061061a565b50505050905090810190601f1680156106625780820380516001836020036101000a031916815260200191505b5096505050505050506040516020818303038152906040527f2ced7cef000000000000000000000000000000000000000000000000000000007bffffffffffffffffffffffffffffffffffffffffffffffffffffffff19166020820180517bffffffffffffffffffffffffffffffffffffffffffffffffffffffff83818316178352505050506106f2565b505050565b60008151905060006a636f6e736f6c652e6c6f679050602083016000808483855afa5050505050565b828054600181600116156101000203166002900490600052602060002090601f016020900481019282601f1061075c57805160ff191683800117855561078a565b8280016001018555821561078a579182015b8281111561078957825182559160200191906001019061076e565b5b509050610797919061079b565b5090565b5b808211156107b457600081600090555060010161079c565b509056fe4368616e67696e67206772656574696e672066726f6d202725732720746f2027257327a264697066735822122080d8f439195534dd69bf6cfffb23ceffc5a6bde840bc1cbf1482054a1783b44a64736f6c634300070300334465706c6f79696e67206120477265657465722077697468206772656574696e673a";

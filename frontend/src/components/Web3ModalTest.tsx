

// import Web3 from "web3";
// import WalletConnectProvider from "@walletconnect/web3-provider";
import Web3Modal from "web3modal";

const providerOptions = {
    // walletconnect: {
    //     package: WalletConnectProvider,
    //     options: {
    //       // Mikko's test key - don't copy as your mileage may vary
    //       infuraId: "8043bb2cf99347b1bfadfb233c5325c0",
    //     }
    //   },
  
    //   fortmatic: {
    //     package: Fortmatic,
    //     options: {
    //       // Mikko's TESTNET api key
    //       key: "pk_test_391E26A3B43A3350"
    //     }
    //   }
};

const web3Modal = new Web3Modal({
    network: "mainnet", // optional
    cacheProvider: false, // optional
    providerOptions // required
});



export function useWeb3Modal() {
    return web3Modal
}
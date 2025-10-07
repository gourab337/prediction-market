import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";

dotenv.config();

// Make sure to set these environment variables
const PRIVATE_KEY = process.env.PRIVATE_KEY || "";
const ABSTRACT_RPC = process.env.ABSTRACT_RPC || "https://api.testnet.abs.xyz";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      },
      viaIR: true
    }
  },
  networks: {
    hardhat: {},
    "abstract-testnet": {
      url: ABSTRACT_RPC,
      accounts: [PRIVATE_KEY],
      chainId: 11124
    }
  },
  etherscan: {
    apiKey: {
      "abstract-testnet": process.env.ETHERSCAN_API_KEY || ""
    },
    customChains: [
      {
        network: "abstract-testnet",
        chainId: 11124,
        urls: {
          apiURL: "https://api-sepolia.abscan.org/v2/api",
          browserURL: "https://sepolia.abscan.org/"
        }
      }
    ]
  }
};

export default config;
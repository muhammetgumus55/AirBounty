import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";
import * as path from "path";

// Always load from the repo root regardless of cwd
dotenv.config({ path: path.resolve(__dirname, ".env") });

const monadRpc = process.env.MONAD_RPC;
const rawPrivateKey = process.env.PRIVATE_KEY;

const normalizedPrivateKey = rawPrivateKey
  ? rawPrivateKey.startsWith("0x")
    ? rawPrivateKey
    : `0x${rawPrivateKey}`
  : undefined;

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    localhost: {
      url: "http://127.0.0.1:8545",
    },
    ...(monadRpc && {
      monadTestnet: {
        url: monadRpc,
        chainId: 10143,
        accounts: normalizedPrivateKey ? [normalizedPrivateKey] : [],
      },
    }),
  },
};

export default config;

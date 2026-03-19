// Bypass self-signed certificate issues in corporate/proxy environments
// for compiler download. Remove this line if not behind a corporate proxy.
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

require("@nomicfoundation/hardhat-ethers");
require("dotenv").config();

const HEDERA_TESTNET_ENDPOINT =
  process.env.HEDERA_TESTNET_ENDPOINT || "https://testnet.hashio.io/api";
const DEPLOYER_PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY || "";

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      //evmVersion: "paris", // Hedera supports up to Paris; avoids PUSH0 opcode issues
    },
  },
  defaultNetwork: "hardhat",
  networks: {
    hardhat: {},
    hederaTestnet: {
      // Hedera Testnet JSON-RPC relay (HashIO public endpoint)
      url: HEDERA_TESTNET_ENDPOINT,
      accounts: DEPLOYER_PRIVATE_KEY ? [DEPLOYER_PRIVATE_KEY] : [],
      chainId: 296,
      // Hedera has different gas behaviour — set generous limits
      gas: 3000000,
      gasPrice: "auto",
      timeout: 120000, // 2 min — Hedera relay can be slow
    },
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
};
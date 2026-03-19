// Bypass self-signed certificate issues in corporate/proxy environments
// for compiler download. Remove this line if not behind a corporate proxy.
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

require("@nomicfoundation/hardhat-ethers");
require("dotenv").config();

const HEDERA_TESTNET_ENDPOINT =
  process.env.HEDERA_TESTNET_ENDPOINT || "https://testnet.hashio.io/api";
const SERVICE_ACCOUNT_PRIVATE_KEY = process.env.SERVICE_ACCOUNT_PRIVATE_KEY || "";

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      evmVersion: "paris", // Hedera supports up to Paris; avoids PUSH0 opcode issues
    },
  },
  defaultNetwork: "hardhat",
  networks: {
    hardhat: {},
    hederaTestnet: {
      // Hedera Testnet JSON-RPC relay (HashIO public endpoint)
      url: HEDERA_TESTNET_ENDPOINT,
      accounts: SERVICE_ACCOUNT_PRIVATE_KEY ? [SERVICE_ACCOUNT_PRIVATE_KEY] : [],
      chainId: 296,
      // Hedera gas settings — deployment needs higher gas limit
      gas: 4000000,
      timeout: 180000, // 3 min — Hedera relay can be slow
    },
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
};
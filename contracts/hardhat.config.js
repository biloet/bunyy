require("@nomicfoundation/hardhat-ethers");
require("@nomicfoundation/hardhat-chai-matchers");
require("dotenv").config();

const path = require("path");
const { subtask } = require("hardhat/config");
const { TASK_COMPILE_SOLIDITY_GET_SOLC_BUILD } = require("hardhat/builtin-tasks/task-names");

const SOLC_VERSION = "0.8.24";

// Use the solcjs build shipped in node_modules/solc instead of downloading a compiler,
// so compiling works offline and behind restrictive proxies.
subtask(TASK_COMPILE_SOLIDITY_GET_SOLC_BUILD, async (args, hre, runSuper) => {
  if (args.solcVersion !== SOLC_VERSION) return runSuper();
  const solc = require("solc");
  return {
    compilerPath: path.join(path.dirname(require.resolve("solc")), "soljson.js"),
    isSolcJs: true,
    version: args.solcVersion,
    longVersion: solc.version(),
  };
});

const accounts = process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [];

module.exports = {
  solidity: {
    version: SOLC_VERSION,
    settings: {
      optimizer: { enabled: true, runs: 200 },
      evmVersion: "cancun",
      viaIR: true,
    },
  },
  networks: {
    robinhoodTestnet: {
      url: process.env.ROBINHOOD_TESTNET_RPC_URL || "",
      chainId: 46630,
      accounts,
    },
    robinhood: {
      url: process.env.ROBINHOOD_RPC_URL || "",
      chainId: 4663,
      accounts,
    },
  },
};

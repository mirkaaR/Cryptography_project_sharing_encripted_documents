require("dotenv").config();
require("@nomicfoundation/hardhat-toolbox");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.24",
  defaultNetwork: "hardhat", // dodato - koristi lokalni hardhat node za testove
  networks: {
    hardhat: {
      chainId: 31337, // lokalni test chain
    },
    localhost: {
      url: "http://127.0.0.1:8545", // lokalni node ako pokrećeš ručno sa npx hardhat node
      chainId: 31337,
    },
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL || "",
      accounts: process.env.DEPLOYER_PK ? [process.env.DEPLOYER_PK] : [],
      chainId: 11155111,
    },
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_KEY || "",
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
  mocha: {
    timeout: 40000, // sprečava "test timeout" grešku kod dužih deploy-eva
  },
};

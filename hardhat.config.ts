import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "hardhat-gas-reporter";
import { vars } from "hardhat/config";

const PRIVATE_KEY = vars.get("PRIVATE_KEY");

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
  gasReporter: {
    enabled: true, 
  },
  networks: {
    hardhat: {
        chainId: 1337,
        allowUnlimitedContractSize: true,
    }
  },
};

export default config;

import 'hardhat-deploy';
import '@nomiclabs/hardhat-ethers';
import '@nomiclabs/hardhat-waffle';
import '@typechain/hardhat';

import { HardhatUserConfig } from 'hardhat/types';

const config: HardhatUserConfig = {
  defaultNetwork: 'hardhat',
  networks: {
    hardhat: {},
    localhost: { timeout: 300000 },
  },
  namedAccounts: {
    deployer: {
      default: 0
    }
  },
  solidity: {
    version: '0.5.2',
    settings: {
      optimizer: {
        enabled: true, // TODO: Maybe investigate contract size issue with optimizer off
        runs: 800
      }
    }
  },
  typechain: {
    outDir: 'typechain',
    target: 'ethers-v5'
  }
};

export default config;
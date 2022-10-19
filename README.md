# VWBL-protocol
VWBL is an on-chain, condition-based, decentralized access control protocol. The VWBL protocol enables the creation of NFTs which only rightful NFT owners can fully access their owned digital content. By utilizing the VWBL protocol, developers can create services to provide blockchain users (NFT creators and digital content consumers) with decentralized encryption functionality.

## Install and Compile
1. Install npm packages
```bash
yarn install
```
2. In the project root directory, set Mnemonic Phrase or Secret Key to `.secret` file.
3. Compile smart contract
```bash
yarn compile
```

## Run unit tests
```bash
yarn test
```

## Deployment
1. Write contract deployment script to [migrations/1_initial_migration.js](https://github.com/VWBL/VWBL-protocol/blob/master/migrations/1_initial_migration.js). 
＊See [doc](https://app.gitbook.com/o/XKJRuS9VhgLSsEarEY4P/s/CNC1YmYHucLw7YmJFhGF/end-point-for-vwbl) for VWBL contract already deployed.
2. Set deploy config to [truffle-config.js](https://github.com/VWBL/VWBL-protocol/blob/master/truffle-config.js#L60)
3. Run deployment script
```bash
yarn deploy --network <network name>
```


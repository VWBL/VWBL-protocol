# VWBL-protocol
VWBL is an on-chain, condition-based, decentralized access control protocol. The VWBL protocol enables the creation of NFTs which only rightful NFT owners can fully access their owned digital content. By utilizing the VWBL protocol, developers can create services to provide blockchain users (NFT creators and digital content consumers) with decentralized encryption functionality.

## How to Deploy Your Own VWBL Smart Contract
### Install Packages
```bash
yarn install
```

### Compile Smart Contract
```bash
yarn compile
```
※Smart contract will be compiled automatically when you depoly it, 
 so you can skip this step if you want
 
### Depoly Smart Contract
1. Create `.secret` file in the project root directory
    ```bash
    touch .secret
    ```

2. Set mnemonic phrase or secret key of your wallet to `.secret` file

3. Set Env
   
   (i)  copy `.env.exmaple` and rename it to `.env`
   
   (ii) set env 
   
   **※If you want to upload metada to IPFS, you can skip this step**
   
     ```
     VWBL_METADATA_URL="http://xxx.yyy.com/metadata/"
     ```
   e.g. Amazon cloudfront URL that links to S3 bucket
   
   **DO NOT forget to add `/metadata/` to the end of the URL**

4. Write contract deployment script to [migrations/1_initial_migration.js](https://github.com/VWBL/VWBL-protocol/blob/master/migrations/1_initial_migration.js). 

    ＊See [VWBL docs](https://app.gitbook.com/o/XKJRuS9VhgLSsEarEY4P/s/CNC1YmYHucLw7YmJFhGF/end-point-for-vwbl) for VWBL contract already deployed.

5. Set deploy config to [truffle-config.js](https://github.com/VWBL/VWBL-protocol/blob/master/truffle-config.js#L60)

6. Run deployment script
    ```bash
    yarn deploy --network <network name>
    ```

## Run Unit Tests
```bash
yarn test
```

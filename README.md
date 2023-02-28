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
1. Set Env
   
   set env to `./config/.env.${network_name}`
   
   **※If you want to upload metada to IPFS, you can skip setting metadata url**
   
     ```
     VWBL_METADATA_URL="http://xxx.yyy.com/metadata/"
     ```
   e.g. Amazon cloudfront URL that links to S3 bucket
   
   **DO NOT forget to add `/metadata/` to the end of the URL**

2. Run deployment script
    ```bash
    yarn deploy:${network_name}
    ```

## Run Unit Tests
```bash
yarn test
```
## Output Solidity contract sizes with Hardhat.
```bash
yarn run hardhat size-contracts
```

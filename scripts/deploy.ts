// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
import { ethers } from "hardhat"
import * as dotenv from "dotenv"
import { Contract } from "ethers"
dotenv.config()

async function main() {
    // Hardhat always runs the compile task when running scripts with its command
    // line interface.
    //
    // If this script is run directly using `node` you may want to call compile
    // manually to make sure everything is compiled
    // await hre.run('compile');
    const baseURI = process.env.METADATA_URL!
    console.log("VWBL Metadata URL: ", baseURI)

    const gatewayProxyContractAddress = process.env.GATEWAY_PROXY_ADDRESS!;
    const accessControlCheckerByNFTContractAddress = process.env.ACCESS_CONTROL_CHECKER_BY_NFT_ADDRESS!;
    const messageToBeSigned = process.env.MESSAGE_TO_BE_SIGNED!;
    console.log("Message to be signed: ", messageToBeSigned);

    let VWBLERC721Contract: Contract;

    const vwblERC721 = await ethers.getContractFactory("VWBL")
    VWBLERC721Contract = await vwblERC721.deploy(
        baseURI,
        gatewayProxyContractAddress,
        accessControlCheckerByNFTContractAddress,
        messageToBeSigned
    );

    console.log("VWBLERC721 Contract deployed to:", VWBLERC721Contract.address)

    /**
     * Below is deploy script of VWBLMetadata Contract.
     * Unlike the VWBL Contract, the metadata url is stored when mint.
    
    let VWBLERC721MetadataContract: Contract;

    const vwblERC721Metadata = await ethers.getContractFactory("VWBLMetadata")
    VWBLERC721MetadataContract = await vwblERC721Metadata.deploy(
        gatewayProxyContractAddress,
        accessControlCheckerByNFTContractAddress,
        messageToBeSigned
    )
    console.log("VWBLERC721 Metadata Contract deployed to:", VWBLERC721MetadataContract.address)
    */

}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error)
    process.exitCode = 1
})

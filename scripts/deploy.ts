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

    const gatewayProxyContractAddress = "0xa0cbAF6872f80172Bf0a471bC447440edFEC4475"
    const accessControlCheckerByNFTContractAddress = "0x9c9bd1b3376ccf3d695d9233c04e865e556f8980"

    let VWBLERC721Contract: Contract

    const vwblERC721 = await ethers.getContractFactory("VWBL")
    VWBLERC721Contract = await vwblERC721.deploy(
        baseURI,
        gatewayProxyContractAddress,
        accessControlCheckerByNFTContractAddress
    )

    console.log("VWBLERC721 Contract deployed to:", VWBLERC721Contract.address)
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error)
    process.exitCode = 1
})

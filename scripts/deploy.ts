// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
import { ethers } from "hardhat";
import * as dotenv from "dotenv";
import { Contract } from "ethers";
dotenv.config();

async function main() {
  // Hardhat always runs the compile task when running scripts with its command
  // line interface.
  //
  // If this script is run directly using `node` you may want to call compile
  // manually to make sure everything is compiled
  // await hre.run('compile');
  const baseURI = process.env.METADATA_URL || "http://xxx.yyy.com";
  console.log({ baseURI });

  // let BizCardNFTContract: Contract;
  let GatewayContract: Contract;
  let GatewayProxyContract: Contract;
  let AccessControlCheckerByERC1155: Contract;
  const feeWei = "100";

  const vwblGateway = await ethers.getContractFactory("VWBLGateway");
  GatewayContract = await vwblGateway.deploy(feeWei);

  console.log("Gateway Contract deployed to:", GatewayContract.address);

  const gatewayProxy = await ethers.getContractFactory("GatewayProxy");
  GatewayProxyContract = await gatewayProxy.deploy(GatewayContract.address);

  console.log(
    "GatewayProxy Contract deployed to:",
    GatewayProxyContract.address
  );

  const accessControlCheckerByERC1155 = await ethers.getContractFactory(
    "AccessControlCheckerByERC1155"
  );
  AccessControlCheckerByERC1155 = await accessControlCheckerByERC1155.deploy(
    GatewayProxyContract.address
  );

  console.log("AccessControlChecker Contract deployed to:", GatewayContract.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

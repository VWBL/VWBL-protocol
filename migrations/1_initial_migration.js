const vwblERC721 = artifacts.require("VWBL")
const vwblMetadata = artifacts.require("VWBLMetadata")
const ExternalNFT = artifacts.require("ExternalNFT")
const vwblGateway = artifacts.require("VWBLGateway")
const gatewayProxy = artifacts.require("GatewayProxy");
const accessControlCheckerByNFT = artifacts.require("AccessControlCheckerByNFT")
const configs = require("./config")

const migrateTest = async (config, deployer) => {
  await deployer.deploy(vwblGateway, "1000000000000000000")
  const vwblGatewayContract = await vwblGateway.deployed()
  await deployer.deploy(gatewayProxy, vwblGatewayContract.address);
  const gatewayProxyContract = await gatewayProxy.deployed();
  await deployer.deploy(accessControlCheckerByNFT, gatewayProxyContract.address);
  const accessControlCheckerByNFTContract = await accessControlCheckerByNFT.deployed();
  await deployer.deploy(vwblERC721, config.vwblMetadataUrl, gatewayProxyContract.address, accessControlCheckerByNFTContract.address)
  await deployer.deploy(ExternalNFT)
  await deployer.deploy(vwblMetadata, gatewayProxyContract.address, accessControlCheckerByNFTContract.address)
}

const migrateERC721 = async (config, deployer) => {
  console.log('VWBL Metadata URL: ', config.vwblMetadataUrl)
  const gatewayProxyContractAddress = "";
  const accessControlCheckerByNFTContractAddress = "";
  await deployer.deploy(vwblERC721, config.vwblMetadataUrl, gatewayProxyContractAddress, accessControlCheckerByNFTContractAddress);
  await vwblERC721.deployed();
  // If you want to set the NFT metadata url with the full path, run the script below.
  //await deployer.deploy(vwblMetadata, gatewayProxyContractAddress, accessControlCheckerByNFTContractAddress)
  //await vwblMetadata.deployed();
}

module.exports = async function (deployer, network) {
  const config = configs[network]
  if (network === "test") {
    // when testing
    await migrateTest(config, deployer)
  } else {
    await migrateERC721(config, deployer)
  }
}

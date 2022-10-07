const vwblERC721 = artifacts.require("VWBL")
const vwblMetadata = artifacts.require("VWBLMetadata")
const ExternalNFT = artifacts.require("ExternalNFT")
const vwblGateway = artifacts.require("VWBLGateway")
const accessControlCheckerByNFT = artifacts.require("AccessControlCheckerByNFT")

const configs = require("./config")

const migrateTest = async (config, deployer) => {
  await deployer.deploy(vwblGateway, "1000000000000000000")
  const vwblGatewayContract = await vwblGateway.deployed()
  await deployer.deploy(accessControlCheckerByNFT, vwblGatewayContract.address);
  const accessControlCheckerByNFTContract = await accessControlCheckerByNFT.deployed();
  await deployer.deploy(vwblERC721, config.vwblMetadataUrl, vwblGatewayContract.address, accessControlCheckerByNFTContract.address)
  await deployer.deploy(ExternalNFT)
  await deployer.deploy(vwblMetadata, vwblGatewayContract.address, accessControlCheckerByNFTContract.address)
}

const migrateERC721 = async (config, deployer) => {
  console.log('VWBL Metadata URL: ', config.vwblMetadataUrl)
  await deployer.deploy(vwblGateway, "10000000000000000") // 0.01 ETH
  const vwblGatewayContract = await vwblGateway.deployed()
  await deployer.deploy(accessControlCheckerByNFT, vwblGatewayContract.address);
  const accessControlCheckerByNFTContract = await accessControlCheckerByNFT.deployed();
  await deployer.deploy(vwblERC721, config.vwblMetadataUrl, vwblGatewayContract.address, accessControlCheckerByNFTContract.address)
  await deployer.deploy(vwblMetadata, vwblGatewayContract.address, accessControlCheckerByNFTContract.address)
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

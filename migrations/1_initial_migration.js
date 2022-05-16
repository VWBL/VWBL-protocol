const lazyVWBL = artifacts.require("VWBLLazyMinting")
const vwblERC1155 = artifacts.require("VWBLERC1155")
const vwblERC721 = artifacts.require("VWBL")
const ExternalNFT = artifacts.require("ExternalNFT")
const vwblGateway = artifacts.require("VWBLGateway")

const configs = require("./config")

const migrateTest = async (config, deployer, accounts) => {
  await deployer.deploy(vwblGateway, "1000000000000000000")
  const vwblGatewayContract = await vwblGateway.deployed()
  await deployer.deploy(lazyVWBL, accounts[0], config.lazyMetadataUrl, vwblGatewayContract.address)
  await deployer.deploy(vwblERC721, config.lazyMetadataUrl, vwblGatewayContract.address)
  await deployer.deploy(vwblERC1155, config.vwblMetadataUrl)
  await deployer.deploy(ExternalNFT)
}

const migrateERC721 = async (config, deployer, accounts) => {
  await deployer.deploy(vwblGateway, "1000000000000000000")
  const vwblGatewayContract = await vwblGateway.deployed()
  await deployer.deploy(vwblERC721, config.lazyMetadataUrl, vwblGatewayContract.address)
}

const migrateERC1155 = async (config) => {
  // TODO: Need to implement ERC1155 Gateway
  await deployer.deploy(vwblERC1155, config.vwblMetadataUrl)
}

const migrateLazyVWBL = async (config) => {
  await deployer.deploy(vwblGateway, "1000000000000000000")
  const vwblGatewayContract = await vwblGateway.deployed()
  await deployer.deploy(lazyVWBL, accounts[0], config.lazyMetadataUrl, vwblGatewayContract.address)
}

module.exports = async function (deployer, network, accounts) {
  const config = configs[network]
  if (network === "develop") {
    // when testing
    await migrateTest(config, deployer, accounts)
  } else {
    await migrateERC721(config, deployer, accounts)
  }
}

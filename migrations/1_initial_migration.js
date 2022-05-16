const lazyVWBL = artifacts.require("VWBLLazyMinting")
const vwblERC1155 = artifacts.require("VWBLERC1155")
const vwblERC721 = artifacts.require("VWBL")
const ExternalNFT = artifacts.require("ExternalNFT")
const vwblGateway = artifacts.require("VWBLGateway")

const configs = require("./config")
module.exports = async function (deployer, network, accounts) {
  const config = configs[network]
  if(network !== 'develop') {
    await deployer.deploy(vwblGateway, "1000000000000000000")
    const vwblGatewayContract = await vwblGateway.deployed()
    await deployer.deploy(vwblERC721, config.lazyMetadataUrl, vwblGatewayContract.address)
  } else {
    // when testing
    await deployer.deploy(vwblGateway, "1000000000000000000")
    const vwblGatewayContract = await vwblGateway.deployed()
    await deployer.deploy(lazyVWBL, accounts[0], config.lazyMetadataUrl, vwblGatewayContract.address)
    await deployer.deploy(vwblERC721, config.lazyMetadataUrl, vwblGatewayContract.address)
    await deployer.deploy(vwblERC1155, config.vwblMetadataUrl)
    await deployer.deploy(ExternalNFT)
  }
}

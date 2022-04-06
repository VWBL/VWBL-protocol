const vwbl = artifacts.require("VWBL")

const configs = require("./config")
module.exports = async function (deployer, network) {
  const config = configs[network]
  await deployer.deploy(vwbl, config.vwblMetadataUrl, config.gatewayContractAddress)
}

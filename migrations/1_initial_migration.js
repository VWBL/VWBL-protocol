const VWBL = artifacts.require("VWBL");
const lazyVWBL = artifacts.require("VWBLLazyMinting");
const configs = require("./config")
module.exports = function (deployer, network, accounts) {
  const config = configs[network]
  deployer.deploy(VWBL, config.vwblMetadataUrl);
  deployer.deploy(lazyVWBL, accounts[0], config.lazyMetadataUrl);
};

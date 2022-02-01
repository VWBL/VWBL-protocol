const VWBL = artifacts.require("VWBL");
const lazyVWBL = artifacts.require("VWBLLazyMinting");
const auction = artifacts.require("Auction");
const market = artifacts.require("Market");
const configs = require("./config");
module.exports = async function (deployer, network, accounts) {
  const config = configs[network];
  await deployer.deploy(VWBL, config.vwblMetadataUrl);
  await deployer.deploy(lazyVWBL, accounts[0], config.lazyMetadataUrl);
  await deployer.deploy(auction, VWBL.address);
  await deployer.deploy(market, VWBL.address);
  await deployer.deploy(auction, lazyVWBL.address);
  await deployer.deploy(market, lazyVWBL.address);
};

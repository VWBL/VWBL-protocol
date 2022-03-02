const lazyVWBL = artifacts.require("VWBLLazyMinting");
const tranferVWBLNFT = artifacts.require("TransferVWBLNFT");
const configs = require("./config");
module.exports = async function (deployer, network, accounts) {
  const config = configs[network];
  await deployer.deploy(lazyVWBL, accounts[0], config.lazyMetadataUrl);
  const lazyVWBLContract = await lazyVWBL.deployed();
  await deployer.deploy(tranferVWBLNFT, lazyVWBLContract.address);
};

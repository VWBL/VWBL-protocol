const lazyVWBL = artifacts.require("VWBLLazyMinting");
const vwblERC1155 = artifacts.require("VWBLERC1155");
const vwblGateway = artifacts.require("VWBLGateway");

const configs = require("./config");
module.exports = async function (deployer, network, accounts) {
  const config = configs[network];
  await deployer.deploy(vwblGateway);
  const vwblGatewayContract = await vwblGateway.deployed();
  await deployer.deploy(lazyVWBL, accounts[0], config.lazyMetadataUrl, vwblGatewayContract.address);
  const lazyVWBLContract = await lazyVWBL.deployed();
  await deployer.deploy(vwblERC1155, config.vwblMetadataUrl);
  const vwblERC1155Contract = await vwblERC1155.deployed();
};

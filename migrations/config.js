module.exports={
  development: {
    vwblMetadataUrl: process.env.VWBL_METADATA_URL || "http://xxx.yyy.com",
  },
  develop: {
    vwblMetadataUrl: process.env.VWBL_METADATA_URL || "http://xxx.yyy.com",
  },
  test: {
    vwblMetadataUrl: process.env.VWBL_METADATA_URL || "http://xxx.yyy.com",
  },
  polygon: {
    vwblMetadataUrl: process.env.VWBL_METADATA_URL || "http://xxx.yyy.com",
    gatewayProxyContractAddress: "0xa0cbAF6872f80172Bf0a471bC447440edFEC4475",
    accessControlCheckerByNFTContractAddress: "0x9c9bd1b3376ccf3d695d9233c04e865e556f8980",
  },
  goerli: {
    vwblMetadataUrl: process.env.VWBL_METADATA_URL || "http://xxx.yyy.com",
  }
};

module.exports={
  development: {
    vwblMetadataUrl: process.env.VWBL_METADATA_URL || "http://xxx.yyy.com",
    lazyMetadataUrl: process.env.VWBL_METADATA_URL || "http://xxx.zzz.com",
  },
  test: {
    vwblMetadataUrl: process.env.VWBL_METADATA_URL || "http://xxx.yyy.com",
    lazyMetadataUrl: process.env.LAZY_METADATA_URL || "http://xxx.zzz.com",
  },
  polygon: {
    vwblMetadataUrl: process.env.VWBL_METADATA_URL || "http://xxx.yyy.com",
    lazyMetadataUrl: process.env.LAZY_METADATA_URL || "http://xxx.zzz.com",
  },
  ropsten: {
    vwblMetadataUrl: process.env.VWBL_METADATA_URL || "http://xxx.yyy.com",
    lazyMetadataUrl: process.env.LAZY_METADATA_URL || "http://xxx.zzz.com",
  }
};

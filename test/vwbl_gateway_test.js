const { assert } = require("chai")
const VWBLGateway = artifacts.require("VWBLGateway")
const GatewayProxy = artifacts.require("GatewayProxy");
const AccessControlCheckerByNFT = artifacts.require("AccessControlCheckerByNFT")
const AccessCondition = artifacts.require("AccessCondition")
const ExternalNFT = artifacts.require("ExternalNFT")
const VWBLERC721 = artifacts.require("VWBL")
const VWBLMetadata = artifacts.require("VWBLMetadata")
const TransferVWBLNFT = artifacts.require("TransferVWBLNFT")
const { expectRevert } = require("@openzeppelin/test-helpers")
const { web3 } = require("@openzeppelin/test-helpers/src/setup")

contract("VWBLGateway test", async (accounts) => {
  let vwblGateway;
  let gatewayProxy;
  let accessControlCheckerByNFT;
  let accessCondition;
  let externalNFT;
  let vwblERC721;
  let vwblMetadata;
  let transferVWBLNFTContract;

  const TEST_DOCUMENT_ID1 = "0x7c00000000000000000000000000000000000000000000000000000000000000";
  const TEST_DOCUMENT_ID2 = "0x3c00000000000000000000000000000000000000000000000000000000000000";
  const TEST_DOCUMENT_ID3 = "0x6c00000000000000000000000000000000000000000000000000000000000000";
  const TEST_DOCUMENT_ID4 = "0x1c00000000000000000000000000000000000000000000000000000000000000";
  const TEST_DOCUMENT_ID5 = "0x8c00000000000000000000000000000000000000000000000000000000000000";
  const fee = web3.utils.toWei("1", "ether");

  it("should deploy", async () => {
    vwblGateway = await VWBLGateway.new(fee, { from: accounts[0] });
    gatewayProxy = await GatewayProxy.new(vwblGateway.address, { from: accounts[0] });
    accessControlCheckerByNFT = await AccessControlCheckerByNFT.new(gatewayProxy.address, { from: accounts[0] })
    accessCondition = await AccessCondition.new();
    externalNFT = await ExternalNFT.new({ from: accounts[0] })
    vwblERC721 = await VWBLERC721.new("http://xxx.yyy.com", gatewayProxy.address, accessControlCheckerByNFT.address, { from: accounts[0] })
    vwblMetadata = await VWBLMetadata.new(gatewayProxy.address, accessControlCheckerByNFT.address, { from: accounts[0] })
    transferVWBLNFTContract = await TransferVWBLNFT.new();

    await externalNFT.mint(accounts[1])
    const owner = await externalNFT.ownerOf(0)
    assert.equal(owner, accounts[1])
  })

  it("should return false from hasAccessControl", async () => {
    const isPermitted = await vwblGateway.hasAccessControl(accounts[1], TEST_DOCUMENT_ID1)
    assert.equal(isPermitted, false)
  })

  it("should successfully grant AccessControl under VWBL.mint()", async () => {
    const beforeBalance = await web3.eth.getBalance(vwblGateway.address)
    await vwblERC721.mint("http://xxx.yyy.com", 500, TEST_DOCUMENT_ID1, {
      from: accounts[2],
      value: web3.utils.toWei("1", "ether"),
    })

    const afterBalance = await web3.eth.getBalance(vwblGateway.address)
    assert.equal(Number(afterBalance) - Number(beforeBalance), web3.utils.toWei("1", "ether"))

    const createdToken = await accessControlCheckerByNFT.documentIdToToken(TEST_DOCUMENT_ID1);
    assert.equal(createdToken.contractAddress, vwblERC721.address)

    const isPermitted = await vwblGateway.hasAccessControl(accounts[2], TEST_DOCUMENT_ID1)
    assert.equal(isPermitted, true)
  })

  it("should successfully grant AccessControl calling from external nft EOA", async () => {
    const beforeBalance = await web3.eth.getBalance(vwblGateway.address);
    await accessControlCheckerByNFT.grantAccessControlAndRegisterNFT(TEST_DOCUMENT_ID2, externalNFT.address, 0, {
      value: web3.utils.toWei("1", "ether"),
      from: accounts[1],
    });

    const afterBalance = await web3.eth.getBalance(vwblGateway.address)
    assert.equal(Number(afterBalance) - Number(beforeBalance), web3.utils.toWei("1", "ether"))

    const createdToken = await accessControlCheckerByNFT.documentIdToToken(TEST_DOCUMENT_ID2);
    assert.equal(createdToken.contractAddress, externalNFT.address);
    const owner = await accessControlCheckerByNFT.getOwnerAddress(TEST_DOCUMENT_ID2);
    assert(owner, accounts[2]);
    const isPermitted = await vwblGateway.hasAccessControl(accounts[1], TEST_DOCUMENT_ID2);
    assert.equal(isPermitted, true)
  });

  it("should successfully transfer nft and minter has access control", async () => {
    await vwblERC721.setApprovalForAll(transferVWBLNFTContract.address, true, {from: accounts[2]});
    await transferVWBLNFTContract.transferNFT(vwblERC721.address, accounts[3], 1, { from: accounts[2] });

    const isPermittedOfMinter = await vwblGateway.hasAccessControl(accounts[2], TEST_DOCUMENT_ID1)
    assert.equal(isPermittedOfMinter, true);

    const isPermittedOfOwner = await vwblGateway.hasAccessControl(accounts[3], TEST_DOCUMENT_ID1)
    assert.equal(isPermittedOfOwner, true)
  })

  it("should fail to grant AccessControl to NFT when fee amount is invalid", async () => {
    await expectRevert(
      accessControlCheckerByNFT.grantAccessControlAndRegisterNFT(TEST_DOCUMENT_ID3, externalNFT.address, 0, {
        value: web3.utils.toWei("0.9", "ether"),
        from: accounts[1],
      }),
      "Fee is insufficient"
    )

    await expectRevert(
      accessControlCheckerByNFT.grantAccessControlAndRegisterNFT(TEST_DOCUMENT_ID3, externalNFT.address, 0, {
        value: web3.utils.toWei("1.1", "ether"),
        from: accounts[1],
      }),
      "Fee is too high"
    )
  });

  it ("should fail to grant AccessControl to NFT when documentId is already used", async () => {
    await expectRevert(
      accessControlCheckerByNFT.grantAccessControlAndRegisterNFT(TEST_DOCUMENT_ID1, externalNFT.address, 0, {
        value: web3.utils.toWei("1", "ether"),
        from: accounts[1],
      }),
      "documentId is already used"
    )
  })

  it ("should get nft datas", async () => {
    const nftDatas = await accessControlCheckerByNFT.getNFTDatas();
    assert.isTrue(nftDatas[0].includes(TEST_DOCUMENT_ID1));
    assert.isTrue(nftDatas[0].includes(TEST_DOCUMENT_ID2));
    assert.equal(nftDatas[1][0].contractAddress, vwblERC721.address.toString());
    assert.equal(nftDatas[1][0].tokenId, '1');
    assert.equal(nftDatas[1][1].contractAddress, externalNFT.address.toString());
    assert.equal(nftDatas[1][1].tokenId, '0');
  })

  it("should fail to grant AccessControl to condition contract when fee amount is invalid", async () => {
    await expectRevert(
      vwblGateway.grantAccessControl(TEST_DOCUMENT_ID4, accessCondition.address, accounts[0], {
        value: web3.utils.toWei("0.9", "ether"),
        from: accounts[1],
      }),
      "Fee is insufficient"
    )

    await expectRevert(
      vwblGateway.grantAccessControl(TEST_DOCUMENT_ID4, accessCondition.address, accounts[0], {
        value: web3.utils.toWei("1.1", "ether"),
        from: accounts[1],
      }),
      "Fee is too high"
    )
  })

  it ("should fail to grant AccessControl to condition contract when documentId is already used", async () => {
    await expectRevert(
      vwblGateway.grantAccessControl(TEST_DOCUMENT_ID1, accessCondition.address, accounts[0], {
        value: web3.utils.toWei("1", "ether"),
        from: accounts[1],
      }),
      "documentId is already used"
    )
  })

  it("should successfully grant AccessControl to condition contract", async () => {
    const beforeBalance = await web3.eth.getBalance(vwblGateway.address)
    await vwblGateway.grantAccessControl(TEST_DOCUMENT_ID4, accessCondition.address, accounts[0], {
      from: accounts[1],
      value: web3.utils.toWei("1", "ether"),
    });

    const afterBalance = await web3.eth.getBalance(vwblGateway.address)
    assert.equal(Number(afterBalance) - Number(beforeBalance), web3.utils.toWei("1", "ether"))

    const contractAddress = await vwblGateway.documentIdToConditionContract(TEST_DOCUMENT_ID4);
    assert.equal(contractAddress, accessCondition.address);
    await vwblGateway.payFee(TEST_DOCUMENT_ID4, accounts[1],{value: fee});

    const isPermitted = await vwblGateway.hasAccessControl(accounts[1], TEST_DOCUMENT_ID4);
    assert.equal(isPermitted, true)
  })

  it ("should fail to grant AccessControl to condition contract when documentId is already used", async () => {
    await expectRevert(
      vwblGateway.grantAccessControl(TEST_DOCUMENT_ID4, accessCondition.address, accounts[0], {
        value: web3.utils.toWei("1", "ether"),
        from: accounts[2],
      }),
      "documentId is already used"
    )
  })

  it("should hasAccessControl return false when condition contract return false", async () => {
    await accessCondition.setCondition(false);
    const isPermitted = await vwblGateway.hasAccessControl(accounts[1], TEST_DOCUMENT_ID4);
    assert.equal(isPermitted, false);
  })

  it("should successfully grant AccessControl under VWBLMetadata.mint()", async () => {
    const beforeBalance = await web3.eth.getBalance(vwblGateway.address)
    await vwblMetadata.mint(
      "https://infura-ipfs.io/ipfs/QmeGAVddnBSnKc1DLE7DLV9uuTqo5F7QbaveTjr45JUdQn",
      "http://xxx.yyy.com",
      500,
      TEST_DOCUMENT_ID5,
    {
      from: accounts[2],
      value: web3.utils.toWei("1", "ether"),
    })

    const afterBalance = await web3.eth.getBalance(vwblGateway.address)
    assert.equal(Number(afterBalance) - Number(beforeBalance), web3.utils.toWei("1", "ether"))

    const createdToken = await accessControlCheckerByNFT.documentIdToToken(TEST_DOCUMENT_ID5);
    assert.equal(createdToken.contractAddress, vwblMetadata.address)

    const isPermitted = await vwblGateway.hasAccessControl(accounts[2], TEST_DOCUMENT_ID5)
    assert.equal(isPermitted, true)

    const metadataURI = await vwblMetadata.tokenURI(1);
    assert.equal(metadataURI, "https://infura-ipfs.io/ipfs/QmeGAVddnBSnKc1DLE7DLV9uuTqo5F7QbaveTjr45JUdQn")
  })

  it("should not withdraw fee from not contract owner", async () => {
    await expectRevert(
      vwblGateway.withdrawFee({from: accounts[1]}),
      "Ownable: caller is not the owner"
    )
  })

  it("should withdraw fee from contract owner", async () => {
    const beforeOwnerBalance = await web3.eth.getBalance(accounts[0]);
    const beforeGatewayBalance = await web3.eth.getBalance(vwblGateway.address);

    await vwblGateway.withdrawFee({from: accounts[0]});

    const afterOwnerBalance = await web3.eth.getBalance(accounts[0]);
    const afterGatewayBalance = await web3.eth.getBalance(vwblGateway.address);
    assert.equal(afterGatewayBalance, web3.utils.toWei("0"));
    console.log("    Change of gateway contract balance:", Number(beforeGatewayBalance) - Number(afterGatewayBalance));
    console.log("    Change of contract owner balance: ", Number(afterOwnerBalance) - Number(beforeOwnerBalance));
  })

  it("should not set feeWei from not contract owner", async () => {
    await expectRevert(
      vwblGateway.setFeeWei(web3.utils.toWei("2", "ether"), { from: accounts[1] }),
      "Ownable: caller is not the owner"
    )
  })

  it("should set feeWei from contract owner", async () => {
    const oldFeeWei = await vwblGateway.feeWei()
    assert.equal(oldFeeWei.toString(), web3.utils.toWei("1", "ether"))

    await vwblGateway.setFeeWei(web3.utils.toWei("2", "ether"), { from: accounts[0] })

    const newFeeWei = await vwblGateway.feeWei()
    assert.equal(newFeeWei.toString(), web3.utils.toWei("2", "ether"))
  })

  it ("should not set VWBLGateway contract from not contract owner", async () => {
    await expectRevert(
      gatewayProxy.setGatewayAddress(accounts[4], {
        from: accounts[1],
      }),
      "Ownable: caller is not the owner"
    )

    await expectRevert(
      gatewayProxy.setGatewayAddress(accounts[5], {
        from: accounts[1],
      }),
      "Ownable: caller is not the owner"
    )
  })

  it ("should set VWBLGateway contract from contract owner", async () => {
    await gatewayProxy.setGatewayAddress(accounts[4], { from: accounts[0] });
    let newContract = await gatewayProxy.getGatewayAddress();
    assert.equal(newContract, accounts[4]);

    await gatewayProxy.setGatewayAddress(accounts[5], { from: accounts[0] });
    newContract = await gatewayProxy.getGatewayAddress();
    assert.equal(newContract, accounts[5]);
  })

  it("should not set Access check contract from not contract owner", async () => {
    await expectRevert(
      vwblERC721.setAccessCheckerContract(accounts[4], {
        from: accounts[1]
      }),
      "Ownable: caller is not the owner"
    )
  })

  it("should set Access check contract from contract owner", async () => {
    await vwblERC721.setAccessCheckerContract(accounts[4], { from: accounts[0] });
    const newContract = await vwblERC721.accessCheckerContract();
    assert.equal(newContract, accounts[4]);
  })
})

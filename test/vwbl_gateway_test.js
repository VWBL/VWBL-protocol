const { assert } = require("chai")
const VWBLGateway = artifacts.require("VWBLGateway")
const ExternalNFT = artifacts.require("ExternalNFT")
const VWBLERC721 = artifacts.require("VWBL")
const { expectRevert } = require("@openzeppelin/test-helpers")
const { web3 } = require("@openzeppelin/test-helpers/src/setup")

contract("VWBLGateway test", async (accounts) => {
  let vwblGateway
  let externalNFT
  let vwblERC721

  const TEST_DOCUMENT_ID1 = "0x7c00000000000000000000000000000000000000000000000000000000000000";
  const TEST_DOCUMENT_ID2 = "0x3c00000000000000000000000000000000000000000000000000000000000000";
  const TEST_DOCUMENT_ID3 = "0x6c00000000000000000000000000000000000000000000000000000000000000";

  it("should deploy", async () => {
    vwblGateway = await VWBLGateway.new(web3.utils.toWei("1", "ether"), { from: accounts[0] })
    externalNFT = await ExternalNFT.new({ from: accounts[0] })
    vwblERC721 = await VWBLERC721.new("http://xxx.yyy.com", vwblGateway.address, { from: accounts[0] })

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

    const createdToken = await vwblGateway.documentIdToToken(TEST_DOCUMENT_ID1);
    assert.equal(createdToken.contractAddress, vwblERC721.address)

    const isPermitted = await vwblGateway.hasAccessControl(accounts[2], TEST_DOCUMENT_ID1)
    assert.equal(isPermitted, true)
  })

  it("should successfully grant AccessControl calling from external nft EOA", async () => {
    const beforeBalance = await web3.eth.getBalance(vwblGateway.address)
    await vwblGateway.grantAccessControl(TEST_DOCUMENT_ID2, externalNFT.address, 0, {
      value: web3.utils.toWei("1", "ether"),
      from: accounts[1],
    })

    const afterBalance = await web3.eth.getBalance(vwblGateway.address)
    assert.equal(Number(afterBalance) - Number(beforeBalance), web3.utils.toWei("1", "ether"))

    const createdToken = await vwblGateway.documentIdToToken(TEST_DOCUMENT_ID2);
    assert.equal(createdToken.contractAddress, externalNFT.address)

    const isPermitted = await vwblGateway.hasAccessControl(accounts[1], TEST_DOCUMENT_ID2)
    assert.equal(isPermitted, true)
  })

  it("should fail to grant AccessControl when fee amount is invalid", async () => {
    await expectRevert(
      vwblGateway.grantAccessControl(TEST_DOCUMENT_ID3, externalNFT.address, 0, {
        value: web3.utils.toWei("0.9", "ether"),
        from: accounts[1],
      }),
      "Fee is insufficient"
    )

    await expectRevert(
      vwblGateway.grantAccessControl(TEST_DOCUMENT_ID3, externalNFT.address, 0, {
        value: web3.utils.toWei("1.1", "ether"),
        from: accounts[1],
      }),
      "Fee is too high"
    )
  });

  it ("should failt to grant AccessControl when documentId is already used", async () => {
    await expectRevert(
      vwblGateway.grantAccessControl(TEST_DOCUMENT_ID1, externalNFT.address, 0, {
        value: web3.utils.toWei("1", "ether"),
        from: accounts[1],
      }),
      "documentId is already used"
    )
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
})
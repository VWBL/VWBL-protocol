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

  const TEST_DOCUMENT_ID = "0x736f6d657468696e67"

  it("should deploy", async () => {
    vwblGateway = await VWBLGateway.new({ from: accounts[0] })
    externalNFT = await ExternalNFT.new({ from: accounts[0] })
    vwblERC721 = await VWBLERC721.new("http://xxx.yyy.com", vwblGateway.address, { from: accounts[0] })

    await externalNFT.mint(accounts[1])
    const owner = await externalNFT.ownerOf(0)
    assert.equal(owner, accounts[1])
  })

  it("should return false from hasAccessControll", async () => {
    const isPermitted = await vwblGateway.hasAccessControl(accounts[1], TEST_DOCUMENT_ID)
    assert.equal(isPermitted, false)
  })

  it("should successfully grant AccessControl when externalNFT owner call", async () => {
    await vwblGateway.grantAccessControl(TEST_DOCUMENT_ID, externalNFT.address, 0, {
      value: web3.utils.toWei("1", "ether"),
      from: accounts[1],
    })

    const createdToken = await vwblGateway.tokens(0)
    assert.equal(createdToken.contractAddress, externalNFT.address)

    const isPermitted = await vwblGateway.hasAccessControl(accounts[1], TEST_DOCUMENT_ID)
    assert.equal(isPermitted, true)
  })

  // it("should successfully grant AccessControl under minting method", async () => {
  //   // await web3.eth.sendTransaction({ from: accounts[3], to: vwbl.address, value: web3.utils.toWei("1", "ether") })
  //   await vwblERC721.mint("http://xxx.yyy.com", 500, TEST_DOCUMENT_ID, {
  //     from: accounts[2],
  //     value: web3.utils.toWei("1", "ether"),
  //   })

  //   const createdToken = await vwblGateway.tokens(1)
  //   assert.equal(createdToken.contractAddress, externalNFT.address)

  //   const isPermitted = await vwblGateway.hasAccessControl(accounts[2], TEST_DOCUMENT_ID)
  //   assert.equal(isPermitted, true)
  // })

  //   it("should fail to grant AccessControl when not externalNFT owner call", async () => {
  //     await expectRevert(
  //       vwblGateway.grantAccessControl(TEST_DOCUMENT_ID, externalNFT.address, 0, {
  //         value: web3.utils.toWei("1", "ether"),
  //         from: accounts[2],
  //       }),
  //       "Only externalNFT owner can add accessControl"
  //     )
  //   })

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

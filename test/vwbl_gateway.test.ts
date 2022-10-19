import { Contract } from "ethers"
import { ethers } from "hardhat"
import { assert } from "chai"

const { expectRevert } = require("@openzeppelin/test-helpers")
const { web3 } = require("@openzeppelin/test-helpers/src/setup")

describe("VWBLGateway test", async () => {
  const [owner, ...accounts] = await ethers.getSigners()
  let vwblGateway: Contract
  let gatewayProxy: Contract
  let accessControlCheckerByNFT: Contract
  let accessCondition: Contract
  let externalNFT: Contract
  let vwblERC721: Contract
  let vwblMetadata: Contract
  let transferVWBLNFTContract: Contract

  const TEST_DOCUMENT_ID1 = "0x7c00000000000000000000000000000000000000000000000000000000000000"
  const TEST_DOCUMENT_ID2 = "0x3c00000000000000000000000000000000000000000000000000000000000000"
  const TEST_DOCUMENT_ID3 = "0x6c00000000000000000000000000000000000000000000000000000000000000"
  const TEST_DOCUMENT_ID4 = "0x1c00000000000000000000000000000000000000000000000000000000000000"
  const TEST_DOCUMENT_ID5 = "0x8c00000000000000000000000000000000000000000000000000000000000000"
  const fee = web3.utils.toWei("1", "ether")

  it("should deploy", async () => {
    const VWBLGateway = await ethers.getContractFactory("VWBLGateway")
    vwblGateway = await VWBLGateway.deploy(fee)

    const GatewayProxy = await ethers.getContractFactory("GatewayProxy")
    gatewayProxy = await GatewayProxy.deploy(vwblGateway.address)

    const AccessControlCheckerByNFT = await ethers.getContractFactory("AccessControlCheckerByNFT")
    accessControlCheckerByNFT = await AccessControlCheckerByNFT.deploy(gatewayProxy.address)

    const AccessCondition = await ethers.getContractFactory("AccessCondition")
    accessCondition = await AccessCondition.deploy()

    const ExternalNFT = await ethers.getContractFactory("ExternalNFT")
    externalNFT = await ExternalNFT.deploy()

    const VWBLERC721 = await ethers.getContractFactory("VWBLERC721")
    vwblERC721 = await VWBLERC721.deploy("http://xxx.yyy.com", gatewayProxy.address, accessControlCheckerByNFT.address)

    const VWBLMetadata = await ethers.getContractFactory("VWBLMetadata")
    vwblMetadata = await VWBLMetadata.deploy(
      "http://xxx.yyy.com",
      gatewayProxy.address,
      accessControlCheckerByNFT.address
    )

    const TransferVWBLNFT = await ethers.getContractFactory("TransferVWBLNFT")
    transferVWBLNFTContract = await TransferVWBLNFT.deploy()

    await externalNFT.mint(accounts[1].address)
    const owner = await externalNFT.ownerOf(0)
    assert.equal(owner, accounts[1].address)
  })

  it("should return false from hasAccessControl", async () => {
    const isPermitted = await vwblGateway.hasAccessControl(accounts[1].address, TEST_DOCUMENT_ID1)
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

    const createdToken = await accessControlCheckerByNFT.documentIdToToken(TEST_DOCUMENT_ID1)
    assert.equal(createdToken.contractAddress, vwblERC721.address)

    const isPermitted = await vwblGateway.hasAccessControl(accounts[2], TEST_DOCUMENT_ID1)
    assert.equal(isPermitted, true)
  })

  it("should successfully grant AccessControl calling from external nft EOA", async () => {
    const beforeBalance = await web3.eth.getBalance(vwblGateway.address)
    await accessControlCheckerByNFT.grantAccessControlAndRegisterNFT(TEST_DOCUMENT_ID2, externalNFT.address, 0, {
      value: web3.utils.toWei("1", "ether"),
      from: accounts[1].address,
    })

    const afterBalance = await web3.eth.getBalance(vwblGateway.address)
    assert.equal(Number(afterBalance) - Number(beforeBalance), web3.utils.toWei("1", "ether"))

    const createdToken = await accessControlCheckerByNFT.documentIdToToken(TEST_DOCUMENT_ID2)
    assert.equal(createdToken.contractAddress, externalNFT.address)
    const owner = await accessControlCheckerByNFT.getOwnerAddress(TEST_DOCUMENT_ID2)
    assert(owner, accounts[2].address)
    const isPermitted = await vwblGateway.hasAccessControl(accounts[1], TEST_DOCUMENT_ID2)
    assert.equal(isPermitted, true)
  })

  it("should successfully transfer nft and minter has access control", async () => {
    await vwblERC721.setApprovalForAll(transferVWBLNFTContract.address, true, { from: accounts[2].address })
    await transferVWBLNFTContract.transferNFT(vwblERC721.address, accounts[3].address, 1, { from: accounts[2].address })

    const isPermittedOfMinter = await vwblGateway.hasAccessControl(accounts[2].address, TEST_DOCUMENT_ID1)
    assert.equal(isPermittedOfMinter, true)

    const isPermittedOfOwner = await vwblGateway.hasAccessControl(accounts[3].address, TEST_DOCUMENT_ID1)
    assert.equal(isPermittedOfOwner, true)
  })

  it("should fail to grant AccessControl to NFT when fee amount is invalid", async () => {
    await expectRevert(
      accessControlCheckerByNFT.grantAccessControlAndRegisterNFT(TEST_DOCUMENT_ID3, externalNFT.address, 0, {
        value: web3.utils.toWei("0.9", "ether"),
        from: accounts[1].address,
      }),
      "Fee is insufficient"
    )

    await expectRevert(
      accessControlCheckerByNFT.grantAccessControlAndRegisterNFT(TEST_DOCUMENT_ID3, externalNFT.address, 0, {
        value: web3.utils.toWei("1.1", "ether"),
        from: accounts[1].address,
      }),
      "Fee is too high"
    )
  })

  it("should fail to grant AccessControl to NFT when documentId is already used", async () => {
    await expectRevert(
      accessControlCheckerByNFT.grantAccessControlAndRegisterNFT(TEST_DOCUMENT_ID1, externalNFT.address, 0, {
        value: web3.utils.toWei("1", "ether"),
        from: accounts[1].address,
      }),
      "documentId is already used"
    )
  })

  it("should get nft datas", async () => {
    const nftDatas = await accessControlCheckerByNFT.getNFTDatas()
    assert.isTrue(nftDatas[0].includes(TEST_DOCUMENT_ID1))
    assert.isTrue(nftDatas[0].includes(TEST_DOCUMENT_ID2))
    assert.equal(nftDatas[1][0].contractAddress, vwblERC721.address.toString())
    assert.equal(nftDatas[1][0].tokenId, "1")
    assert.equal(nftDatas[1][1].contractAddress, externalNFT.address.toString())
    assert.equal(nftDatas[1][1].tokenId, "0")
  })

  it("should fail to grant AccessControl to condition contract when fee amount is invalid", async () => {
    await expectRevert(
      vwblGateway.grantAccessControl(TEST_DOCUMENT_ID4, accessCondition.address, accounts[0].address, {
        value: web3.utils.toWei("0.9", "ether"),
        from: accounts[1].address,
      }),
      "Fee is insufficient"
    )

    await expectRevert(
      vwblGateway.grantAccessControl(TEST_DOCUMENT_ID4, accessCondition.address, accounts[0].address, {
        value: web3.utils.toWei("1.1", "ether"),
        from: accounts[1].address,
      }),
      "Fee is too high"
    )
  })

  it("should fail to grant AccessControl to condition contract when documentId is already used", async () => {
    await expectRevert(
      vwblGateway.grantAccessControl(TEST_DOCUMENT_ID1, accessCondition.address, accounts[0].address, {
        value: web3.utils.toWei("1", "ether"),
        from: accounts[1].address,
      }),
      "documentId is already used"
    )
  })

  it("should successfully grant AccessControl to condition contract", async () => {
    const beforeBalance = await web3.eth.getBalance(vwblGateway.address)
    await vwblGateway.grantAccessControl(TEST_DOCUMENT_ID4, accessCondition.address, accounts[0].address, {
      from: accounts[1].address,
      value: web3.utils.toWei("1", "ether"),
    })

    const afterBalance = await web3.eth.getBalance(vwblGateway.address)
    assert.equal(Number(afterBalance) - Number(beforeBalance), web3.utils.toWei("1", "ether"))

    const contractAddress = await vwblGateway.documentIdToConditionContract(TEST_DOCUMENT_ID4)
    assert.equal(contractAddress, accessCondition.address)
    await vwblGateway.payFee(TEST_DOCUMENT_ID4, accounts[1].address, { value: fee })

    const isPermitted = await vwblGateway.hasAccessControl(accounts[1].address, TEST_DOCUMENT_ID4)
    assert.equal(isPermitted, true)
  })

  it("should fail to grant AccessControl to condition contract when documentId is already used", async () => {
    await expectRevert(
      vwblGateway.grantAccessControl(TEST_DOCUMENT_ID4, accessCondition.address, accounts[0].address, {
        value: web3.utils.toWei("1", "ether"),
        from: accounts[2],
      }),
      "documentId is already used"
    )
  })

  it("should hasAccessControl return false when condition contract return false", async () => {
    await accessCondition.setCondition(false)
    const isPermitted = await vwblGateway.hasAccessControl(accounts[1].address, TEST_DOCUMENT_ID4)
    assert.equal(isPermitted, false)
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
      }
    )

    const afterBalance = await web3.eth.getBalance(vwblGateway.address)
    assert.equal(Number(afterBalance) - Number(beforeBalance), web3.utils.toWei("1", "ether"))

    const createdToken = await accessControlCheckerByNFT.documentIdToToken(TEST_DOCUMENT_ID5)
    assert.equal(createdToken.contractAddress, vwblMetadata.address)

    const isPermitted = await vwblGateway.hasAccessControl(accounts[2], TEST_DOCUMENT_ID5)
    assert.equal(isPermitted, true)

    const metadataURI = await vwblMetadata.tokenURI(1)
    assert.equal(metadataURI, "https://infura-ipfs.io/ipfs/QmeGAVddnBSnKc1DLE7DLV9uuTqo5F7QbaveTjr45JUdQn")
  })

  it("should not withdraw fee from not contract owner", async () => {
    await expectRevert(vwblGateway.withdrawFee({ from: accounts[1].address }), "Ownable: caller is not the owner")
  })

  it("should withdraw fee from contract owner", async () => {
    const beforeOwnerBalance = await web3.eth.getBalance(accounts[0].address)
    const beforeGatewayBalance = await web3.eth.getBalance(vwblGateway.address)

    await vwblGateway.withdrawFee({ from: accounts[0].address })

    const afterOwnerBalance = await web3.eth.getBalance(accounts[0].address)
    const afterGatewayBalance = await web3.eth.getBalance(vwblGateway.address)
    assert.equal(afterGatewayBalance, web3.utils.toWei("0"))
    console.log("    Change of gateway contract balance:", Number(beforeGatewayBalance) - Number(afterGatewayBalance))
    console.log("    Change of contract owner balance: ", Number(afterOwnerBalance) - Number(beforeOwnerBalance))
  })

  it("should not set feeWei from not contract owner", async () => {
    await expectRevert(
      vwblGateway.setFeeWei(web3.utils.toWei("2", "ether"), { from: accounts[1].address }),
      "Ownable: caller is not the owner"
    )
  })

  it("should set feeWei from contract owner", async () => {
    const oldFeeWei = await vwblGateway.feeWei()
    assert.equal(oldFeeWei.toString(), web3.utils.toWei("1", "ether"))

    await vwblGateway.setFeeWei(web3.utils.toWei("2", "ether"), { from: accounts[0].address })

    const newFeeWei = await vwblGateway.feeWei()
    assert.equal(newFeeWei.toString(), web3.utils.toWei("2", "ether"))
  })

  it("should not set VWBLGateway contract from not contract owner", async () => {
    await expectRevert(
      gatewayProxy.setGatewayAddress(accounts[4].address, {
        from: accounts[1].address,
      }),
      "Ownable: caller is not the owner"
    )

    await expectRevert(
      gatewayProxy.setGatewayAddress(accounts[5].address, {
        from: accounts[1].address,
      }),
      "Ownable: caller is not the owner"
    )
  })

  it("should set VWBLGateway contract from contract owner", async () => {
    await gatewayProxy.setGatewayAddress(accounts[4].address, { from: accounts[0].address })
    let newContract = await gatewayProxy.getGatewayAddress()
    assert.equal(newContract, accounts[4].address)

    await gatewayProxy.setGatewayAddress(accounts[5].address, { from: accounts[0].address })
    newContract = await gatewayProxy.getGatewayAddress()
    assert.equal(newContract, accounts[5].address)
  })

  it("should not set Access check contract from not contract owner", async () => {
    await expectRevert(
      vwblERC721.setAccessCheckerContract(accounts[4].address, {
        from: accounts[1].address,
      }),
      "Ownable: caller is not the owner"
    )
  })

  it("should set Access check contract from contract owner", async () => {
    await vwblERC721.setAccessCheckerContract(accounts[4].address, { from: accounts[0].address })
    const newContract = await vwblERC721.accessCheckerContract()
    assert.equal(newContract, accounts[4].address)
  })
})

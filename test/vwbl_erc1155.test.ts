import { Contract } from "ethers"
import { assert } from "chai"
import { ethers } from "hardhat"
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers"

const { expectRevert } = require("@openzeppelin/test-helpers")
const { web3 } = require("@openzeppelin/test-helpers/src/setup")

describe("VWBLERC1155 test", async () => {
  let accounts: SignerWithAddress[];

  before(async () => {
    const [owner, ...signers] = await ethers.getSigners()
    accounts = signers;
  })

  let vwblGateway: Contract
  let gatewayProxy: Contract
  let accessControlCheckerByERC1155: Contract
  let vwblERC1155: Contract

  const TEST_DOCUMENT_ID1 = "0xac00000000000000000000000000000000000000000000000000000000000000"
  const TEST_DOCUMENT_ID2 = "0xbc00000000000000000000000000000000000000000000000000000000000000"
  const TEST_DOCUMENT_ID3 = "0xcc00000000000000000000000000000000000000000000000000000000000000"
  const TEST_DOCUMENT_ID4 = "0xdc00000000000000000000000000000000000000000000000000000000000000"
  const fee = web3.utils.toWei("1", "ether")

  it("should deploy", async () => {
    const VWBLGateway = await ethers.getContractFactory("VWBLGateway")
    vwblGateway = await VWBLGateway.deploy(fee)

    const GatewayProxy = await ethers.getContractFactory("GatewayProxy")
    gatewayProxy = await GatewayProxy.deploy(vwblGateway.address)

    const AccessControlCheckerByERC1155 = await ethers.getContractFactory("AccessControlCheckerByERC1155")
    accessControlCheckerByERC1155 = await AccessControlCheckerByERC1155.deploy(gatewayProxy.address)

    const VWBLERC1155 = await ethers.getContractFactory("VWBLERC1155")
    vwblERC1155 = await VWBLERC1155.deploy(
      "http://xxx.yyy.com",
      gatewayProxy.address,
      accessControlCheckerByERC1155.address
    )

    const INTERFACE_ID_ERC2981 = "0x2a55205a"
    const supported = await vwblERC1155.supportsInterface(INTERFACE_ID_ERC2981)
    assert.equal(supported, true)
  })

  it("should return false from hasAccessControl", async () => {
    const isPermitted = await vwblGateway.hasAccessControl(accounts[1].address, TEST_DOCUMENT_ID1)
    assert.equal(isPermitted, false)
  })

  it("should mint nft", async () => {
    await vwblERC1155.mint(
      "http://xxx.yyy.com",
      100, // token amount
      500, // royalty = 5%
      TEST_DOCUMENT_ID1,
      {
        value: web3.utils.toWei("1", "ether"),
        from: accounts[1].address,
      }
    )
    const tokens = await vwblERC1155.getTokenByMinter(accounts[1].address)
    assert.equal(tokens[0].minterAddress, accounts[1].address, "Minter is not correct")
    assert.equal(tokens[0].getKeyURl, "http://xxx.yyy.com", "keyURL is not correct")

    const tokenAmount = await vwblERC1155.balanceOf(accounts[1].address, 1)
    assert.equal(tokenAmount, 100)

    const royaltyInfo = await vwblERC1155.tokenIdToRoyaltyInfo(1)
    assert.equal(royaltyInfo.recipient, accounts[1].address)
    assert.equal(royaltyInfo.royaltiesPercentage, 500)

    console.log("     accounts[1].address mint tokenId = 1, amount =", tokenAmount.toString(), " nft")

    const createdToken = await accessControlCheckerByERC1155.documentIdToToken(TEST_DOCUMENT_ID1)
    assert.equal(createdToken.contractAddress, vwblERC1155.address)

    const isPermitted = await vwblGateway.hasAccessControl(accounts[1].address, TEST_DOCUMENT_ID1)
    assert.equal(isPermitted, true)
  })

  it("should get nft datas", async () => {
    const erc1155Datas = await accessControlCheckerByERC1155.getERC1155Datas()
    assert.equal(erc1155Datas[0][0], TEST_DOCUMENT_ID1)
    assert.equal(erc1155Datas[1][0].contractAddress, vwblERC1155.address.toString())
    assert.equal(erc1155Datas[1][0].tokenId, "1")
  })

  it("should mint multiple nfts", async () => {
    await vwblERC1155.mint(
      "http://xxx.yyy.zzz.com",
      200, // token amount
      500, // royalty = 5%
      TEST_DOCUMENT_ID2,
      {
        value: web3.utils.toWei("1", "ether"),
        from: accounts[1].address,
      }
    )
    const tokens = await vwblERC1155.getTokenByMinter(accounts[1].address)
    assert.equal(tokens[1].minterAddress, accounts[1].address, "Minter is not correct")
    assert.equal(tokens[1].getKeyURl, "http://xxx.yyy.zzz.com", "keyURL is not correct")

    const tokenAmount = await vwblERC1155.balanceOf(accounts[1].address, 2)
    assert.equal(tokenAmount, 200)

    const royaltyInfo = await vwblERC1155.tokenIdToRoyaltyInfo(2)
    assert.equal(royaltyInfo.recipient, accounts[1].address)
    assert.equal(royaltyInfo.royaltiesPercentage, 500)

    console.log("     accounts[1].address mint tokenId = 2, amount =", tokenAmount.toString(), " nft")

    const createdToken = await accessControlCheckerByERC1155.documentIdToToken(TEST_DOCUMENT_ID2)
    assert.equal(createdToken.contractAddress, vwblERC1155.address)

    const isPermitted = await vwblGateway.hasAccessControl(accounts[1].address, TEST_DOCUMENT_ID2)
    assert.equal(isPermitted, true)
  })

  it("should get tokens of owner after mint", async () => {
    const tokenCountOfOwner = await vwblERC1155.tokenCountOfOwner(accounts[1].address)
    assert.equal(tokenCountOfOwner, 2)

    for (let i = 0; i < tokenCountOfOwner; i++) {
      const tokenId = await vwblERC1155.tokenOfOwnerByIndex(accounts[1].address, i)
      console.log("     accounts[1].address has tokenId =", tokenId.toString(), "nft")
    }
  })

  it("should transfer", async () => {
    await vwblERC1155.safeTransferFrom(accounts[1].address, accounts[2].address, 1, 10, "0x0", {
      from: accounts[1].address,
    })

    const tokenAmountOfOwner1 = await vwblERC1155.balanceOf(accounts[1].address, 1)
    assert.equal(tokenAmountOfOwner1, 90)

    const tokenAmountOfOwner2 = await vwblERC1155.balanceOf(accounts[2].address, 1)
    assert.equal(tokenAmountOfOwner2, 10)
    console.log("     accounts[1].address transfer tokenId = 1 and amount = 10 to accounts[2].address")
  })

  it("should permitted if pay fee", async () => {
    const isPermittedBeforePayFee = await vwblGateway.hasAccessControl(accounts[2].address, TEST_DOCUMENT_ID1)
    assert.equal(isPermittedBeforePayFee, false)
    await vwblGateway.payFee(TEST_DOCUMENT_ID1, accounts[2].address, { value: fee })
    const isPermittedAfterPayFee = await vwblGateway.hasAccessControl(accounts[2].address, TEST_DOCUMENT_ID1)
    assert.equal(isPermittedAfterPayFee, true)
  })

  it("should batch transfer", async () => {
    await vwblERC1155.safeBatchTransferFrom(accounts[1].address, accounts[2].address, [1, 2], [90, 10], "0x0", {
      from: accounts[1].address,
    })

    const token1AmountOfOwner1 = await vwblERC1155.balanceOf(accounts[1].address, 1)
    assert.equal(token1AmountOfOwner1, 0)

    const token2AmountOfOwner1 = await vwblERC1155.balanceOf(accounts[1].address, 2)
    assert.equal(token2AmountOfOwner1, 190)

    const token1AmountOfOwner2 = await vwblERC1155.balanceOf(accounts[2].address, 1)
    assert.equal(token1AmountOfOwner2, 100)
    const token2AmountOfOwner2 = await vwblERC1155.balanceOf(accounts[2].address, 2)
    assert.equal(token2AmountOfOwner2, 10)

    console.log("     accounts[1].address transfer tokenId = 1 and amount = 90 to accounts[2].address")
    console.log("     accounts[1].address transfer tokenId = 2 and amount = 10 to accounts[2].address")
  })

  it("should get tokens of owner after transfer", async () => {
    const tokenCountOfOwner1 = await vwblERC1155.tokenCountOfOwner(accounts[1].address)
    assert.equal(tokenCountOfOwner1, 1)

    for (let i = 0; i < tokenCountOfOwner1; i++) {
      const tokenId = await vwblERC1155.tokenOfOwnerByIndex(accounts[1].address, i)
      console.log("     accounts[1].address has tokenId =", tokenId.toString(), "nft")
    }

    const tokenCountOfOwner2 = await vwblERC1155.tokenCountOfOwner(accounts[2].address)
    assert.equal(tokenCountOfOwner2, 2)

    for (let i = 0; i < tokenCountOfOwner2; i++) {
      const tokenId = await vwblERC1155.tokenOfOwnerByIndex(accounts[2].address, i)
      console.log("     accounts[2].address has tokenId =", tokenId.toString(), "nft")
    }
  })

  it("should batch mint nft", async () => {
    await vwblERC1155.mintBatch(
      "http://aaa.yyy.zzz.com",
      [100, 200],
      [500, 500],
      [TEST_DOCUMENT_ID3, TEST_DOCUMENT_ID4],
      {
        value: web3.utils.toWei("2", "ether"),
        from: accounts[1].address,
      }
    )

    console.log("     accounts[1].address mint tokenId = 3 , amount = 100 nft")
    console.log("     accounts[1].address mint tokenId = 4 , amount = 200 nft")

    const isPermittedOfId3 = await vwblGateway.hasAccessControl(accounts[1].address, TEST_DOCUMENT_ID3)
    assert.equal(isPermittedOfId3, true)

    const isPermittedOfId4 = await vwblGateway.hasAccessControl(accounts[1].address, TEST_DOCUMENT_ID4)
    assert.equal(isPermittedOfId4, true)
  })

  it("should get tokens of owner after batch mint", async () => {
    const tokenCountOfOwner1 = await vwblERC1155.tokenCountOfOwner(accounts[1].address)
    assert.equal(tokenCountOfOwner1, 3)

    for (let i = 0; i < tokenCountOfOwner1; i++) {
      const tokenId = await vwblERC1155.tokenOfOwnerByIndex(accounts[1].address, i)
      console.log("     accounts[1].address has tokenId =", tokenId.toString(), "nft")
    }
  })

  it("should permitted if transferAndPayFee", async () => {
    await vwblERC1155.safeTransferAndPayFee(accounts[1].address, accounts[3].address, 3, 10, "0x0", {
      from: accounts[1].address,
      value: fee,
    })
    const isPermitted = await vwblGateway.hasAccessControl(accounts[3].address, TEST_DOCUMENT_ID3)
    assert.equal(isPermitted, true)
  })

  it("should permitted if batchTransferAndPayFee", async () => {
    await vwblERC1155.safeBatchTransferAndPayFee(accounts[1].address, accounts[3].address, [3, 4], [10, 10], "0x0", {
      from: accounts[1].address,
      value: fee * 2,
    })
    const isPermitted = await vwblGateway.hasAccessControl(accounts[3].address, TEST_DOCUMENT_ID4)
    assert.equal(isPermitted, true)
  })

  it("should not set BaseURI from not contract owner", async () => {
    await expectRevert(
      vwblERC1155.setBaseURI("http://xxx.com", { from: accounts[2].address }),
      "Ownable: caller is not the owner"
    )
  })

  it("should set BaseURI from contract owner", async () => {
    await vwblERC1155.setBaseURI("http://xxx.com", { from: accounts[0].address })
    const baseURI = await vwblERC1155.uri(1)
    assert.equal(baseURI, "http://xxx.com")
  })

  it("should not set Access check contract from not contract owner", async () => {
    await expectRevert(
      vwblERC1155.setAccessCheckerContract(accounts[4], {
        from: accounts[1].address,
      }),
      "Ownable: caller is not the owner"
    )
  })

  it("should set Access check contract from contract owner", async () => {
    await vwblERC1155.setAccessCheckerContract(accounts[4], { from: accounts[0].address })
    const newContract = await vwblERC1155.accessCheckerContract()
    assert.equal(newContract, accounts[4])
  })
})

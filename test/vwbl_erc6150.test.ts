import { Contract, utils } from "ethers"
import { assert, expect } from "chai"
import { ethers } from "hardhat"
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers"

describe("VWBLERC6150", async () => {
    let accounts: SignerWithAddress[]
    let vwblGateway: Contract
    let gatewayProxy: Contract
    let accessControlCheckerByNFT: Contract
    let vwblERC6150: Contract

    const TEST_DOCUMENT_ID1 = "0xac00000000000000000000000000000000000000000000000000000000000000"
    const TEST_DOCUMENT_ID2 = "0xbc00000000000000000000000000000000000000000000000000000000000000"
    const TEST_DOCUMENT_ID3 = "0xcc00000000000000000000000000000000000000000000000000000000000000"
    const TEST_DOCUMENT_ID4 = "0xdc00000000000000000000000000000000000000000000000000000000000000"
    const TEST_DOCUMENT_ID5 = "0xec00000000000000000000000000000000000000000000000000000000000000"
    const fee = utils.parseEther("1")

    before(async () => {
        accounts = await ethers.getSigners()
    })

    it("should deploy", async () => {
        const VWBLGateway = await ethers.getContractFactory("VWBLGateway")
        vwblGateway = await VWBLGateway.deploy(fee)

        const GatewayProxy = await ethers.getContractFactory("GatewayProxy")
        gatewayProxy = await GatewayProxy.deploy(vwblGateway.address)

        const AccessControlCheckerByNFT = await ethers.getContractFactory("AccessControlCheckerByNFT")
        accessControlCheckerByNFT = await AccessControlCheckerByNFT.deploy(gatewayProxy.address)

        const VWBLERC6150 = await ethers.getContractFactory("VWBLERC6150")
        vwblERC6150 = await VWBLERC6150.deploy(
            "http://xxx.yyy.com",
            gatewayProxy.address,
          accessControlCheckerByNFT.address,
            "Hello, VWBL"
        )
    })

    it("should return false from hasAccessControl", async () => {
        const isPermitted = await vwblGateway.hasAccessControl(accounts[1].address, TEST_DOCUMENT_ID1)
        assert.equal(isPermitted, false)
    })

    it("should mint root nft", async () => {
        await vwblERC6150.connect(accounts[1]).mint(
            "http://xxx.yyy.com",
            0, // root
            500, // royalty = 5%
            TEST_DOCUMENT_ID1,
            {
                value: utils.parseEther("1"),
            }
        )
        const tokens = await vwblERC6150.getTokenByMinter(accounts[1].address)
        assert.equal(tokens[0].minterAddress, accounts[1].address, "Minter is not correct")
        assert.equal(tokens[0].getKeyURl, "http://xxx.yyy.com", "keyURL is not correct")

        const tokenAmount = await vwblERC6150.balanceOf(accounts[1].address)
        assert.equal(tokenAmount, 1)

        const royaltyInfo = await vwblERC6150.tokenIdToRoyaltyInfo(1)
        assert.equal(royaltyInfo.recipient, accounts[1].address)
        assert.equal(royaltyInfo.royaltiesPercentage, 500)

        console.log("     accounts[1].address mint tokenId = 1, amount =", tokenAmount.toString(), " nft")

        const createdToken = await accessControlCheckerByNFT.documentIdToToken(TEST_DOCUMENT_ID1)
        assert.equal(createdToken.contractAddress, vwblERC6150.address)

        const isPermitted = await vwblGateway.hasAccessControl(accounts[1].address, TEST_DOCUMENT_ID1)
        assert.equal(isPermitted, true)
    })
    it("should mint child nft", async () => {
        const parentTokenMintTx = await vwblERC6150.connect(accounts[1]).mint(
          "http://xxx.yyy.com",
          0, // root
          500, // royalty = 5%
          TEST_DOCUMENT_ID2,
          {
              value: utils.parseEther("1"),
          }
        );
        const parentTokenMintRc = await parentTokenMintTx.wait();
        const parentMintEvent = parentTokenMintRc.events.find((e: any) => e.event === 'Transfer');
        const parentTokenId = parentMintEvent.args.tokenId;
        const childTokenMintTx = await vwblERC6150.connect(accounts[1]).mint(
          "http://xxx.yyy.com",
          parentTokenId, // root
          500, // royalty = 5%
          TEST_DOCUMENT_ID3,
          {
              value: utils.parseEther("1"),
          }
        );
        const childTokenMintRc = await childTokenMintTx.wait();
        const childMintEvent = childTokenMintRc.events.find((e: any) => e.event === 'Transfer');
        const childTokenId = childMintEvent.args.tokenId;
        const parentOfChild = await vwblERC6150.parentOf(childTokenId);
        assert.equal(parentTokenId.toNumber(), parentOfChild.toNumber())
    })
})

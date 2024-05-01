import { Contract, utils } from "ethers"
import { assert, expect } from "chai"
import { ethers } from "hardhat"
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers"

describe("VWBLERC6150ERC2981", async () => {
    let accounts: SignerWithAddress[]
    let vwblGateway: Contract
    let gatewayProxy: Contract
    let accessControlCheckerByNFT: Contract
    let vwblERC6150ERC2981: Contract

    const TEST_DOCUMENT_ID1 = "0xac00000000000000000000000000000000000000000000000000000000000000"
    const TEST_DOCUMENT_ID2 = "0xbc00000000000000000000000000000000000000000000000000000000000000"
    const TEST_DOCUMENT_ID3 = "0xcc00000000000000000000000000000000000000000000000000000000000000"
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

        const VWBLERC6150ERC2981 = await ethers.getContractFactory("VWBLERC6150ERC2981")
        vwblERC6150ERC2981 = await VWBLERC6150ERC2981.deploy(
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
        await vwblERC6150ERC2981.connect(accounts[1]).mint(
            "http://xxx.yyy.com",
            0, // root
            500, // royalty = 5%
            TEST_DOCUMENT_ID1,
            {
                value: utils.parseEther("1"),
            }
        )
        const tokenIds = await vwblERC6150ERC2981.getTokenByMinter(accounts[1].address);
        const tokens = await Promise.all(tokenIds.map(async(id : number) => await vwblERC6150ERC2981.tokenIdToTokenInfo(id)));
        assert.equal(tokens[0].minterAddress, accounts[1].address, "Minter is not correct")
        assert.equal(tokens[0].getKeyURl, "http://xxx.yyy.com", "keyURL is not correct")

        const tokenAmount = await vwblERC6150ERC2981.balanceOf(accounts[1].address)
        assert.equal(tokenAmount, 1)

        const [receiver, amount] = await vwblERC6150ERC2981.royaltyInfo(1,10000)
        assert.equal(receiver, accounts[1].address)
        assert.equal(amount, 500)

        console.log("     accounts[1].address mint tokenId = 1, amount =", tokenAmount.toString(), " nft")

        const createdToken = await accessControlCheckerByNFT.documentIdToToken(TEST_DOCUMENT_ID1)
        assert.equal(createdToken.contractAddress, vwblERC6150ERC2981.address)

        const isPermitted = await vwblGateway.hasAccessControl(accounts[1].address, TEST_DOCUMENT_ID1)
        assert.equal(isPermitted, true)
    })
    it("should mint child nft", async () => {
        const parentTokenMintTx = await vwblERC6150ERC2981.connect(accounts[1]).mint(
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
        const childTokenMintTx = await vwblERC6150ERC2981.connect(accounts[1]).mint(
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
        const parentOfChild = await vwblERC6150ERC2981.parentOf(childTokenId);
        assert.equal(parentTokenId.toNumber(), parentOfChild.toNumber())
    })

    it("should fail to grant view permission from not erc6150 owner", async () => {
        await expect(
            vwblERC6150ERC2981
                .connect(accounts[2])
                .grantViewPermission(1, accounts[4].address)
        ).to.be.revertedWith("msg sender is not nft owner")
    })

    it("should successfully grant view permission from erc6150 owner", async () => {
        await vwblGateway.connect(accounts[0]).setFeeWei(utils.parseEther("0"))
        await vwblERC6150ERC2981.connect(accounts[1]).grantViewPermission(1, accounts[4].address);
        const isPermitted = await vwblGateway.hasAccessControl(accounts[4].address, TEST_DOCUMENT_ID1)
        assert.equal(isPermitted, true)
    })
})

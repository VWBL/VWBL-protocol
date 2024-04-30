import { expect, assert } from "chai";
import hre from "hardhat";
import { deployContracts, DeploymentInfo, fee, ONE_GWEI } from "./lib/common";

describe("VWBLERC1155ERC2981", async () => {
    let accounts: any;
    let deploymentInfo: DeploymentInfo;
    const TEST_DOCUMENT_ID1 = "0xac00000000000000000000000000000000000000000000000000000000000000"
    const TEST_DOCUMENT_ID2 = "0xbc00000000000000000000000000000000000000000000000000000000000000"
    const TEST_DOCUMENT_ID3 = "0xcc00000000000000000000000000000000000000000000000000000000000000"
    const TEST_DOCUMENT_ID4 = "0xdc00000000000000000000000000000000000000000000000000000000000000"
    const TEST_DOCUMENT_ID5 = "0xec00000000000000000000000000000000000000000000000000000000000000"

    before(async () => {
        accounts = await hre.ethers.getSigners()
    })

    it ("should deploy", async () => {
       deploymentInfo = await deployContracts(accounts[0], accounts[0].address);
    })

    it("should return false from hasAccessControl", async () => {
        const { vwblGateway } = await deploymentInfo;
        const isPermitted = await vwblGateway.hasAccessControl(accounts[1].address, TEST_DOCUMENT_ID1)
        assert.equal(isPermitted, false)
    })

    it("should mint nft", async () => {
        const { vwblGateway, vwblERC1155ERC2981, accessControlCheckerByERC1155 } = deploymentInfo;
        await vwblERC1155ERC2981.connect(accounts[1]).mint(
            "http://xxx.yyy.com",
            100, // token amount
            500, // royalty = 5%
            TEST_DOCUMENT_ID1,
            {
                value: ONE_GWEI,
            }
        )
        const tokenIds = await vwblERC1155ERC2981.getTokenByMinter(accounts[1].address);
        const tokens = await Promise.all(tokenIds.map(async(id : bigint) => await vwblERC1155ERC2981.tokenIdToTokenInfo(id)));
        assert.equal(tokens[0].minterAddress, accounts[1].address, "Minter is not correct")
        assert.equal(tokens[0].getKeyURl, "http://xxx.yyy.com", "keyURL is not correct")

        const tokenAmount = await vwblERC1155ERC2981.balanceOf(accounts[1].address, 1)
        assert.equal(tokenAmount, BigInt(100))

        const [receiver, amount] = await vwblERC1155ERC2981.royaltyInfo(1,10000);
        assert.equal(receiver, accounts[1].address)
        assert.equal(amount, BigInt(500));

        console.log("     accounts[1].address mint tokenId = 1, amount =", tokenAmount.toString(), " nft")

        const createdToken = await accessControlCheckerByERC1155.documentIdToToken(TEST_DOCUMENT_ID1)
        assert.equal(createdToken.contractAddress, await vwblERC1155ERC2981.getAddress())

        const isPermitted = await vwblGateway.hasAccessControl(accounts[1].address, TEST_DOCUMENT_ID1)
        assert.equal(isPermitted, true)
    })

    it("should get nft datas", async () => {
        const { vwblERC1155ERC2981, accessControlCheckerByERC1155 } = deploymentInfo;
        const erc1155Datas = await accessControlCheckerByERC1155.getERC1155Datas()
        assert.equal(erc1155Datas[0][0], TEST_DOCUMENT_ID1)
        assert.equal(erc1155Datas[1][0].contractAddress, await vwblERC1155ERC2981.getAddress())
        assert.equal(erc1155Datas[1][0].tokenId, BigInt(1))
    })

    it("should mint multiple nfts", async () => {
        const { vwblGateway, vwblERC1155ERC2981, accessControlCheckerByERC1155 } = deploymentInfo;
        await vwblERC1155ERC2981.connect(accounts[1]).mint(
            "http://xxx.yyy.zzz.com",
            200, // token amount
            500, // royalty = 5%
            TEST_DOCUMENT_ID2,
            {
                value: ONE_GWEI,
            }
        )
        const tokenIds = await vwblERC1155ERC2981.getTokenByMinter(accounts[1].address);
        const tokens = await Promise.all(tokenIds.map(async(id : bigint) => await vwblERC1155ERC2981.tokenIdToTokenInfo(id)));
        assert.equal(tokens[1].minterAddress, accounts[1].address, "Minter is not correct")
        assert.equal(tokens[1].getKeyURl, "http://xxx.yyy.zzz.com", "keyURL is not correct")

        const tokenAmount = await vwblERC1155ERC2981.balanceOf(accounts[1].address, 2)
        assert.equal(tokenAmount, BigInt(200))

        const [receiver, amount] = await vwblERC1155ERC2981.royaltyInfo(2,10000)
        assert.equal(receiver, accounts[1].address)
        assert.equal(amount, BigInt(500))

        console.log("     accounts[1].address mint tokenId = 2, amount =", tokenAmount.toString(), " nft")

        const createdToken = await accessControlCheckerByERC1155.documentIdToToken(TEST_DOCUMENT_ID2)
        assert.equal(createdToken.contractAddress, await vwblERC1155ERC2981.getAddress())

        const isPermitted = await vwblGateway.hasAccessControl(accounts[1].address, TEST_DOCUMENT_ID2)
        assert.equal(isPermitted, true)
    })

    it("should transfer", async () => {
        const { vwblERC1155ERC2981 } = deploymentInfo;
        await vwblERC1155ERC2981.connect(accounts[1]).safeTransferFrom(accounts[1].address, accounts[2].address, 1, 10, "0x00")

        const tokenAmountOfOwner1 = await vwblERC1155ERC2981.balanceOf(accounts[1].address, 1)
        assert.equal(tokenAmountOfOwner1, BigInt(90))

        const tokenAmountOfOwner2 = await vwblERC1155ERC2981.balanceOf(accounts[2].address, 1)
        assert.equal(tokenAmountOfOwner2, BigInt(10))
        console.log("     accounts[1].address transfer tokenId = 1 and amount = 10 to accounts[2].address")
    })

    it("should permitted if pay fee", async () => {
        const { vwblGateway } = deploymentInfo;
        const isPermittedBeforePayFee = await vwblGateway.hasAccessControl(accounts[2].address, TEST_DOCUMENT_ID1)
        assert.equal(isPermittedBeforePayFee, false)
        await vwblGateway.payFee(TEST_DOCUMENT_ID1, accounts[2].address, { value: fee })
        const isPermittedAfterPayFee = await vwblGateway.hasAccessControl(accounts[2].address, TEST_DOCUMENT_ID1)
        assert.equal(isPermittedAfterPayFee, true)
    })

    it("should batch transfer", async () => {
        const { vwblERC1155ERC2981 } = deploymentInfo;
        await vwblERC1155ERC2981
            .connect(accounts[1])
            .safeBatchTransferFrom(accounts[1].address, accounts[2].address, [1, 2], [90, 10], "0x00")

        const token1AmountOfOwner1 = await vwblERC1155ERC2981.balanceOf(accounts[1].address, 1)
        assert.equal(token1AmountOfOwner1, BigInt(0))

        const token2AmountOfOwner1 = await vwblERC1155ERC2981.balanceOf(accounts[1].address, 2)
        assert.equal(token2AmountOfOwner1, BigInt(190))

        const token1AmountOfOwner2 = await vwblERC1155ERC2981.balanceOf(accounts[2].address, 1)
        assert.equal(token1AmountOfOwner2, BigInt(100))
        const token2AmountOfOwner2 = await vwblERC1155ERC2981.balanceOf(accounts[2].address, 2)
        assert.equal(token2AmountOfOwner2, BigInt(10))

        console.log("     accounts[1].address transfer tokenId = 1 and amount = 90 to accounts[2].address")
        console.log("     accounts[1].address transfer tokenId = 2 and amount = 10 to accounts[2].address")
    })

    it("should batch mint nft", async () => {
    })

    it("should not set BaseURI from not contract owner", async () => {
        const { vwblERC1155ERC2981 } = deploymentInfo;
        await expect(vwblERC1155ERC2981.connect(accounts[2]).setBaseURI("http://xxx.com")).to.be.revertedWithCustomError(
            vwblERC1155ERC2981,
            "OwnableUnauthorizedAccount"
        )
    })

    it("should set BaseURI from contract owner", async () => {
        const { vwblERC1155ERC2981 } = deploymentInfo;
        await vwblERC1155ERC2981.connect(accounts[0]).setBaseURI("http://xxx.com")
        const baseURI = await vwblERC1155ERC2981.uri(1)
        assert.equal(baseURI, "http://xxx.com" + "1")
    })

    it("should not set Access check contract from not contract owner", async () => {
        const { vwblERC1155ERC2981 } = deploymentInfo;
        await expect(vwblERC1155ERC2981.connect(accounts[1]).setAccessCheckerContract(accounts[4].address)).to.be.revertedWithCustomError(
            vwblERC1155ERC2981,
            "OwnableUnauthorizedAccount"
        )
    })

    it("should set Access check contract from contract owner", async () => {
        const { vwblERC1155ERC2981 } = deploymentInfo;
        await vwblERC1155ERC2981.connect(accounts[0]).setAccessCheckerContract(accounts[4].address)
        const newContract = await vwblERC1155ERC2981.accessCheckerContract()
        assert.equal(newContract, accounts[4].address)
    })

    it("should successfully grant AccessControl under VWBLMetadata.mint()", async () => {
        const { vwblGateway, accessControlCheckerByERC1155, vwblERC1155Metadata } = deploymentInfo;
        const beforeBalance = await hre.ethers.provider.getBalance(await vwblGateway.getAddress());
        await vwblERC1155Metadata
            .connect(accounts[2])
            .mint(
                "https://infura-ipfs.io/ipfs/QmeGAVddnBSnKc1DLE7DLV9uuTqo5F7QbaveTjr45JUdQn",
                "http://xxx.yyy.com",
                100,
                500,
                TEST_DOCUMENT_ID5,
                {
                    value: ONE_GWEI,
                }
            )

        const afterBalance = await hre.ethers.provider.getBalance(await vwblGateway.getAddress());
        assert.deepEqual(afterBalance - beforeBalance, BigInt(ONE_GWEI))

        const createdToken = await accessControlCheckerByERC1155.documentIdToToken(TEST_DOCUMENT_ID5)
        assert.equal(createdToken.contractAddress, await vwblERC1155Metadata.getAddress())

        const isPermitted = await vwblGateway.hasAccessControl(accounts[2].address, TEST_DOCUMENT_ID5)
        assert.equal(isPermitted, true)

        const metadataURI = await vwblERC1155Metadata.uri(1)
        assert.equal(metadataURI, "https://infura-ipfs.io/ipfs/QmeGAVddnBSnKc1DLE7DLV9uuTqo5F7QbaveTjr45JUdQn")
    })
})

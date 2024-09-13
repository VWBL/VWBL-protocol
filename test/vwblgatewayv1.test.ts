import { expect, assert } from "chai"
import hre, { ethers } from "hardhat"
import { DeploymentInfo, deployContracts, fee, ONE_GWEI } from "./lib/deployContractsGateway"
import { parseEther, parseUnits } from "ethers"

describe("VWBLGatewayV1 Contract", function () {
    let accounts: any
    let deploymentInfo: DeploymentInfo

    const TEST_DOCUMENT_ID1 = "0xac00000000000000000000000000000000000000000000000000000000000000"
    const TEST_DOCUMENT_ID2 = "0xbc00000000000000000000000000000000000000000000000000000000000000"
    const TEST_DOCUMENT_ID3 = "0xcc00000000000000000000000000000000000000000000000000000000000000"
    const TEST_DOCUMENT_ID4 = "0xdc00000000000000000000000000000000000000000000000000000000000000"
    const TEST_DOCUMENT_ID5 = "0xec00000000000000000000000000000000000000000000000000000000000000"
    before(async function () {
        accounts = await hre.ethers.getSigners()
    })

    it("should deploy", async () => {
        deploymentInfo = await deployContracts(accounts[0], accounts[0].address)
    })

    it("should return false from hasAccessControl", async () => {
        const { vwblGateway } = await deploymentInfo
        const isPermitted = await vwblGateway.hasAccessControl(accounts[1].address, TEST_DOCUMENT_ID1)
        assert.equal(isPermitted, false)
    })

    //  NFTをミントし、関連する情報が正しく設定されているかを確認
    it("should successfully grant AccessControl under VWBL.mint()", async () => {
        const { vwblGateway, vwblERC721, accessControlCheckerByNFT } = await deploymentInfo

        const beforeBalance = await ethers.provider.getBalance(vwblGateway.getAddress())
        await vwblERC721.connect(accounts[2]).mint("http://xxx.yyy.com", 500, TEST_DOCUMENT_ID1, {
            value: ONE_GWEI,
        })

        const afterBalance = await ethers.provider.getBalance(vwblGateway.getAddress())

        assert.equal(afterBalance - beforeBalance, BigInt(ONE_GWEI))

        const createdToken = await accessControlCheckerByNFT.documentIdToToken(TEST_DOCUMENT_ID1)

        assert.equal(createdToken.contractAddress, vwblERC721.target)

        const isPermitted = await vwblGateway.hasAccessControl(accounts[2].address, TEST_DOCUMENT_ID1)
        assert.equal(isPermitted, true)
    })

    it("should successfully grant AccessControl calling from external nft EOA", async () => {
        const { vwblGateway, accessControlCheckerByNFT, externalNFT } = await deploymentInfo
    
        await externalNFT.connect(accounts[2]).mint(accounts[2].address);
        const beforeBalance = await ethers.provider.getBalance(vwblGateway.getAddress())
        await accessControlCheckerByNFT
            .connect(accounts[1])
            .grantAccessControlAndRegisterNFT(TEST_DOCUMENT_ID2, externalNFT.getAddress(), 0, {
                value: ONE_GWEI,
            })
    
        const afterBalance = await ethers.provider.getBalance(vwblGateway.target)
        assert.equal(afterBalance - beforeBalance, BigInt(ONE_GWEI))
    
        const createdToken = await accessControlCheckerByNFT.documentIdToToken(TEST_DOCUMENT_ID2)
        assert.equal(createdToken.contractAddress, externalNFT.target)
        const owner = await accessControlCheckerByNFT.getOwnerAddress(TEST_DOCUMENT_ID2)
        assert.equal(owner, accounts[2].address)
        const isPermitted = await vwblGateway.hasAccessControl(accounts[2].address, TEST_DOCUMENT_ID2)
        assert.equal(isPermitted, true)
    })

    it("should successfully transfer nft and minter has access control", async () => {
        const { vwblGateway, vwblERC721, transferVWBLNFTContract } = await deploymentInfo

        await vwblERC721.connect(accounts[2]).setApprovalForAll(transferVWBLNFTContract.getAddress(), true)
        await transferVWBLNFTContract.connect(accounts[2]).transferNFT(vwblERC721.getAddress(), accounts[3].address, 1)

        const isPermittedOfMinter = await vwblGateway.hasAccessControl(accounts[2].address, TEST_DOCUMENT_ID1)
        assert.equal(isPermittedOfMinter, true)

        const isPermittedOfOwner = await vwblGateway.hasAccessControl(accounts[3].address, TEST_DOCUMENT_ID1)
        assert.equal(isPermittedOfOwner, true)
    })

    it("should fail to grant AccessControl to NFT when fee amount is invalid", async () => {
        const { accessControlCheckerByNFT, externalNFT } = await deploymentInfo
        const ONE_GWEI = 1000000000n // 1 Gwei as bigint
        const lessThanOneGwei = ONE_GWEI - BigInt(100000000) // 0.1 Gwei 減少
        const littleMoreOneGwei = ONE_GWEI + BigInt(100000000) // 0.1 Gwei 増加
        await expect(
            accessControlCheckerByNFT
                .connect(accounts[1])
                .grantAccessControlAndRegisterNFT(TEST_DOCUMENT_ID3, externalNFT.target, 0, {
                    value: lessThanOneGwei,
                })
        ).to.be.revertedWith("Fee is insufficient")
        await expect(
            accessControlCheckerByNFT
                .connect(accounts[1])
                .grantAccessControlAndRegisterNFT(TEST_DOCUMENT_ID3, externalNFT.target, 0, {
                    value: littleMoreOneGwei,
                })
        ).to.be.revertedWith("Fee is too high")
    })
    it("should fail to grant AccessControl to NFT when documentId is already used", async () => {
        const { accessControlCheckerByNFT, externalNFT } = await deploymentInfo

        await expect(
            accessControlCheckerByNFT
                .connect(accounts[1])
                .grantAccessControlAndRegisterNFT(TEST_DOCUMENT_ID1, externalNFT.target, 0, {
                    value: ONE_GWEI,
                })
        ).to.be.revertedWith("documentId is already used")
    })

    it("should get nft datas", async () => {
        const { accessControlCheckerByNFT, externalNFT, vwblERC721 } = await deploymentInfo

        const nftDatas = await accessControlCheckerByNFT.getNFTDatas()
        assert.isTrue(nftDatas[0].includes(TEST_DOCUMENT_ID1))
        assert.isTrue(nftDatas[0].includes(TEST_DOCUMENT_ID2))
        assert.equal(nftDatas[1][0].contractAddress, vwblERC721.target.toString())
        assert.equal(nftDatas[1][0].tokenId, BigInt(1))
        assert.equal(nftDatas[1][1].contractAddress, externalNFT.target.toString())
        assert.equal(nftDatas[1][1].tokenId, BigInt(0))
    })

    it("should fail to grant AccessControl to condition contract when fee amount is invalid", async () => {
        const { vwblGateway, accessCondition } = await deploymentInfo
        const ONE_GWEI = 1000000000n // 1 Gwei as bigint
        const lessThanOneGwei = ONE_GWEI - BigInt(100000000) // 0.1 Gwei 減少
        const littleMoreOneGwei = ONE_GWEI + BigInt(100000000) // 0.1 Gwei 増加
        await expect(
            vwblGateway
                .connect(accounts[1])
                .grantAccessControl(TEST_DOCUMENT_ID4, accessCondition.target, accounts[0].address, {
                    value: lessThanOneGwei,
                })
        ).to.be.revertedWith("Fee is insufficient")

        await expect(
            vwblGateway
                .connect(accounts[1])
                .grantAccessControl(TEST_DOCUMENT_ID4, accessCondition.target, accounts[0].address, {
                    value: littleMoreOneGwei,
                })
        ).to.be.revertedWith("Fee is too high")
    })
    it("should fail to grant AccessControl to condition contract when documentId is already used", async () => {
        const { vwblGateway, accessCondition } = await deploymentInfo

        await expect(
            vwblGateway
                .connect(accounts[1])
                .grantAccessControl(TEST_DOCUMENT_ID1, accessCondition.target, accounts[0].address, {
                    value: ONE_GWEI,
                })
        ).to.be.revertedWith("documentId is already used")
    })

    it("should successfully grant AccessControl to condition contract", async () => {
        const { vwblGateway, accessCondition } = await deploymentInfo

        const beforeBalance = await ethers.provider.getBalance(vwblGateway.target)
        await vwblGateway
            .connect(accounts[1])
            .grantAccessControl(TEST_DOCUMENT_ID4, accessCondition.target, accounts[0].address, {
                value: ONE_GWEI,
            })

        const afterBalance = await ethers.provider.getBalance(vwblGateway.target)

        assert.equal(afterBalance - beforeBalance, BigInt(ONE_GWEI))

        const contractAddress = await vwblGateway.documentIdToConditionContract(TEST_DOCUMENT_ID4)
        assert.equal(contractAddress, accessCondition.target)
        await vwblGateway.payFee(TEST_DOCUMENT_ID4, accounts[1].address, { value: fee })

        const isPermitted = await vwblGateway.hasAccessControl(accounts[1].address, TEST_DOCUMENT_ID4)
        assert.equal(isPermitted, true)
    })
    it("should fail to grant AccessControl to condition contract when documentId is already used", async () => {
        const { vwblGateway, accessCondition } = await deploymentInfo

        await expect(
            vwblGateway
                .connect(accounts[2])
                .grantAccessControl(TEST_DOCUMENT_ID4, accessCondition.target, accounts[0].address, {
                    value: ONE_GWEI,
                })
        ).to.be.revertedWith("documentId is already used")
    })

    it("should hasAccessControl return false when condition contract return false", async () => {
        const { vwblGateway, accessCondition } = await deploymentInfo

        await accessCondition.setCondition(false)
        const isPermitted = await vwblGateway.hasAccessControl(accounts[1].address, TEST_DOCUMENT_ID4)
        assert.equal(isPermitted, false)
    })
    it("should successfully grant AccessControl under VWBLMetadata.mint()", async () => {
        const { vwblGateway, vwblERC721Metadata, accessControlCheckerByNFT } = await deploymentInfo

        const beforeBalance = await ethers.provider.getBalance(vwblGateway.getAddress())
        await vwblERC721Metadata
            .connect(accounts[2])
            .mint(
                "https://infura-ipfs.io/ipfs/QmeGAVddnBSnKc1DLE7DLV9uuTqo5F7QbaveTjr45JUdQn",
                "http://xxx.yyy.com",
                500,
                TEST_DOCUMENT_ID5,
                {
                    value: ONE_GWEI,
                }
            )

        const afterBalance = await ethers.provider.getBalance(vwblGateway.target)
        assert.equal(afterBalance - beforeBalance, BigInt(ONE_GWEI))

        const createdToken = await accessControlCheckerByNFT.documentIdToToken(TEST_DOCUMENT_ID5)
        assert.equal(createdToken.contractAddress, vwblERC721Metadata.target)

        const isPermitted = await vwblGateway.hasAccessControl(accounts[2].address, TEST_DOCUMENT_ID5)
        assert.equal(isPermitted, true)

        const metadataURI = await vwblERC721Metadata.tokenURI(1)
        assert.equal(metadataURI, "https://infura-ipfs.io/ipfs/QmeGAVddnBSnKc1DLE7DLV9uuTqo5F7QbaveTjr45JUdQn")
    })

    it("should not withdraw fee from not contract owner", async () => {
        const { vwblGateway } = await deploymentInfo
        await expect(vwblGateway.connect(accounts[1]).withdrawFee()).to.be.revertedWithCustomError(
            vwblGateway,
            "OwnableUnauthorizedAccount"
        )
    })
    it("should withdraw fee from contract owner", async () => {
        const { vwblGateway } = await deploymentInfo

        const beforeOwnerBalance = await ethers.provider.getBalance(accounts[0].address)
        const beforeGatewayBalance = await ethers.provider.getBalance(vwblGateway.target)

        await vwblGateway.connect(accounts[0]).withdrawFee()

        const afterOwnerBalance = await ethers.provider.getBalance(accounts[0].address)
        const afterGatewayBalance = await ethers.provider.getBalance(vwblGateway.target)

        assert.equal(afterGatewayBalance, 0n) // bigintリテラルを使用

        console.log("    Change of gateway contract balance:", (beforeGatewayBalance - afterGatewayBalance).toString())
        console.log("    Change of contract owner balance: ", (afterOwnerBalance - beforeOwnerBalance).toString())
    })

    it("should not set feeWei from not contract owner", async () => {
        const { vwblGateway } = await deploymentInfo

        await expect(vwblGateway.connect(accounts[1]).setFeeWei(parseEther("2"))).to.be.revertedWithCustomError(
            vwblGateway,
            "OwnableUnauthorizedAccount"
        )
    })
    it("should set feeWei from contract owner", async () => {
        const { vwblGateway } = await deploymentInfo

        const oldFeeWei = await vwblGateway.feeWei()
        assert.equal(oldFeeWei.toString(), parseUnits("1", 9).toString())

        await vwblGateway.connect(accounts[0]).setFeeWei(parseEther("0"))

        const newFeeWei = await vwblGateway.feeWei()
        assert.equal(newFeeWei.toString(), parseEther("0").toString())
    })

    it("should fail to grant view permission from not nft owner", async () => {
        const { vwblERC721 } = await deploymentInfo

        await expect(vwblERC721.connect(accounts[1]).grantViewPermission(1, accounts[4].address)).to.be.revertedWith(
            "msg sender is not nft owner"
        )
    })

    it("should successfully grant view permission from nft owner", async () => {
        const { vwblERC721, vwblGateway } = await deploymentInfo

        await vwblERC721.connect(accounts[3]).grantViewPermission(1, accounts[4].address)
        const isPermitted = await vwblGateway.hasAccessControl(accounts[4].address, TEST_DOCUMENT_ID1)
        assert.equal(isPermitted, true)
    })

    it("should fail to revoke permission from not nft owner", async () => {
        const { vwblERC721 } = await deploymentInfo

        await expect(vwblERC721.connect(accounts[1]).revokeViewPermission(1, accounts[4].address)).to.be.revertedWith(
            "msg sender is not nft owner"
        )
    })

    it("should successfully revoke view permission from nft owner", async () => {
        const { vwblERC721, vwblGateway } = await deploymentInfo

        await vwblERC721.connect(accounts[3]).revokeViewPermission(1, accounts[4].address)
        const isPermitted = await vwblGateway.hasAccessControl(accounts[4].address, TEST_DOCUMENT_ID1)
        assert.equal(isPermitted, false)
    })

    it("should not set VWBLGateway contract from not contract owner", async () => {
        const { gatewayProxy } = await deploymentInfo

        await expect(gatewayProxy.connect(accounts[1]).setGatewayAddress(accounts[4].address)).to.be.revertedWithCustomError(
            gatewayProxy,
            "OwnableUnauthorizedAccount"
        )

        await expect(gatewayProxy.connect(accounts[1]).setGatewayAddress(accounts[5].address)).to.be.revertedWithCustomError(
           gatewayProxy,
           "OwnableUnauthorizedAccount"
        )
    })

    it("should set VWBLGateway contract from contract owner", async () => {
        const { gatewayProxy } = await deploymentInfo

        await gatewayProxy.connect(accounts[0]).setGatewayAddress(accounts[4].address)
        let newContract = await gatewayProxy.getGatewayAddress()
        assert.equal(newContract, accounts[4].address)

        await gatewayProxy.connect(accounts[0]).setGatewayAddress(accounts[5].address)
        newContract = await gatewayProxy.getGatewayAddress()
        assert.equal(newContract, accounts[5].address)
    })

    it("should not set Access check contract from not contract owner", async () => {
        const { vwblERC721 } = await deploymentInfo
        await expect(vwblERC721.connect(accounts[1]).setAccessCheckerContract(accounts[4].address)).to.be.revertedWithCustomError(
            vwblERC721,
            "OwnableUnauthorizedAccount"
        )
    })

    it("should set Access check contract from contract owner", async () => {
        const { vwblERC721 } = await deploymentInfo

        await vwblERC721.connect(accounts[0]).setAccessCheckerContract(accounts[4].address)
        const newContract = await vwblERC721.accessCheckerContract()
        assert.equal(newContract, accounts[4].address)
    })
})

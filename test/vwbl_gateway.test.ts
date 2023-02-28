import { Contract, utils } from "ethers"
import { ethers } from "hardhat"
import { assert, expect } from "chai"
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers"

describe("VWBLGateway", async () => {
    let accounts: SignerWithAddress[]
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
    const fee = utils.parseEther("1.0")

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

        const AccessCondition = await ethers.getContractFactory("AccessCondition")
        accessCondition = await AccessCondition.deploy()

        const ExternalNFT = await ethers.getContractFactory("ExternalNFT")
        externalNFT = await ExternalNFT.deploy()

        const VWBLERC721 = await ethers.getContractFactory("VWBL")
        vwblERC721 = await VWBLERC721.deploy(
            "http://xxx.yyy.com",
            gatewayProxy.address,
            accessControlCheckerByNFT.address,
            "Hello, VWBL"
        )

        const VWBLMetadata = await ethers.getContractFactory("VWBLMetadata")
        vwblMetadata = await VWBLMetadata.deploy(gatewayProxy.address, accessControlCheckerByNFT.address, "Hello, VWBL")

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
        const beforeBalance = await vwblGateway.provider.getBalance(vwblGateway.address)
        await vwblERC721.connect(accounts[2]).mint("http://xxx.yyy.com", 500, TEST_DOCUMENT_ID1, {
            value: utils.parseEther("1"),
        })

        const afterBalance = await vwblGateway.provider.getBalance(vwblGateway.address)
        assert.deepEqual(afterBalance.sub(beforeBalance).eq(utils.parseEther("1.0")), true)

        const createdToken = await accessControlCheckerByNFT.documentIdToToken(TEST_DOCUMENT_ID1)
        assert.equal(createdToken.contractAddress, vwblERC721.address)

        const isPermitted = await vwblGateway.hasAccessControl(accounts[2].address, TEST_DOCUMENT_ID1)
        assert.equal(isPermitted, true)
    })

    it("should successfully grant AccessControl calling from external nft EOA", async () => {
        const beforeBalance = await vwblGateway.provider.getBalance(vwblGateway.address)
        await accessControlCheckerByNFT
            .connect(accounts[1])
            .grantAccessControlAndRegisterNFT(TEST_DOCUMENT_ID2, externalNFT.address, 0, {
                value: utils.parseEther("1"),
            })

        const afterBalance = await vwblGateway.provider.getBalance(vwblGateway.address)
        assert.deepEqual(afterBalance.sub(beforeBalance).eq(utils.parseEther("1")), true)

        const createdToken = await accessControlCheckerByNFT.documentIdToToken(TEST_DOCUMENT_ID2)
        assert.equal(createdToken.contractAddress, externalNFT.address)
        const owner = await accessControlCheckerByNFT.getOwnerAddress(TEST_DOCUMENT_ID2)
        assert(owner, accounts[2].address)
        const isPermitted = await vwblGateway.hasAccessControl(accounts[1].address, TEST_DOCUMENT_ID2)
        assert.equal(isPermitted, true)
    })

    it("should successfully transfer nft and minter has access control", async () => {
        await vwblERC721.connect(accounts[2]).setApprovalForAll(transferVWBLNFTContract.address, true)
        await transferVWBLNFTContract.connect(accounts[2]).transferNFT(vwblERC721.address, accounts[3].address, 1)

        const isPermittedOfMinter = await vwblGateway.hasAccessControl(accounts[2].address, TEST_DOCUMENT_ID1)
        assert.equal(isPermittedOfMinter, true)

        const isPermittedOfOwner = await vwblGateway.hasAccessControl(accounts[3].address, TEST_DOCUMENT_ID1)
        assert.equal(isPermittedOfOwner, true)
    })

    it("should fail to grant AccessControl to NFT when fee amount is invalid", async () => {
        await expect(
            accessControlCheckerByNFT
                .connect(accounts[1])
                .grantAccessControlAndRegisterNFT(TEST_DOCUMENT_ID3, externalNFT.address, 0, {
                    value: utils.parseEther("0.9"),
                })
        ).to.be.revertedWith("Fee is insufficient")

        await expect(
            accessControlCheckerByNFT
                .connect(accounts[1])
                .grantAccessControlAndRegisterNFT(TEST_DOCUMENT_ID3, externalNFT.address, 0, {
                    value: utils.parseEther("1.1"),
                })
        ).to.be.revertedWith("Fee is too high")
    })

    it("should fail to grant AccessControl to NFT when documentId is already used", async () => {
        await expect(
            accessControlCheckerByNFT
                .connect(accounts[1])
                .grantAccessControlAndRegisterNFT(TEST_DOCUMENT_ID1, externalNFT.address, 0, {
                    value: utils.parseEther("1"),
                })
        ).to.be.revertedWith("documentId is already used")
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
        await expect(
            vwblGateway
                .connect(accounts[1])
                .grantAccessControl(TEST_DOCUMENT_ID4, accessCondition.address, accounts[0].address, {
                    value: utils.parseEther("0.9"),
                })
        ).to.be.revertedWith("Fee is insufficient")

        await expect(
            vwblGateway
                .connect(accounts[1])
                .grantAccessControl(TEST_DOCUMENT_ID4, accessCondition.address, accounts[0].address, {
                    value: utils.parseEther("1.1"),
                })
        ).to.be.revertedWith("Fee is too high")
    })

    it("should fail to grant AccessControl to condition contract when documentId is already used", async () => {
        await expect(
            vwblGateway
                .connect(accounts[1])
                .grantAccessControl(TEST_DOCUMENT_ID1, accessCondition.address, accounts[0].address, {
                    value: utils.parseEther("1"),
                })
        ).to.be.revertedWith("documentId is already used")
    })

    it("should successfully grant AccessControl to condition contract", async () => {
        const beforeBalance = await vwblGateway.provider.getBalance(vwblGateway.address)
        await vwblGateway
            .connect(accounts[1])
            .grantAccessControl(TEST_DOCUMENT_ID4, accessCondition.address, accounts[0].address, {
                value: utils.parseEther("1"),
            })

        const afterBalance = await vwblGateway.provider.getBalance(vwblGateway.address)
        assert.deepEqual(afterBalance.sub(beforeBalance).eq(utils.parseEther("1")), true)

        const contractAddress = await vwblGateway.documentIdToConditionContract(TEST_DOCUMENT_ID4)
        assert.equal(contractAddress, accessCondition.address)
        await vwblGateway.payFee(TEST_DOCUMENT_ID4, accounts[1].address, { value: fee })

        const isPermitted = await vwblGateway.hasAccessControl(accounts[1].address, TEST_DOCUMENT_ID4)
        assert.equal(isPermitted, true)
    })

    it("should fail to grant AccessControl to condition contract when documentId is already used", async () => {
        await expect(
            vwblGateway
                .connect(accounts[2])
                .grantAccessControl(TEST_DOCUMENT_ID4, accessCondition.address, accounts[0].address, {
                    value: utils.parseEther("1"),
                })
        ).to.be.revertedWith("documentId is already used")
    })

    it("should hasAccessControl return false when condition contract return false", async () => {
        await accessCondition.setCondition(false)
        const isPermitted = await vwblGateway.hasAccessControl(accounts[1].address, TEST_DOCUMENT_ID4)
        assert.equal(isPermitted, false)
    })

    it("should successfully grant AccessControl under VWBLMetadata.mint()", async () => {
        const beforeBalance = await vwblGateway.provider.getBalance(vwblGateway.address)
        await vwblMetadata
            .connect(accounts[2])
            .mint(
                "https://infura-ipfs.io/ipfs/QmeGAVddnBSnKc1DLE7DLV9uuTqo5F7QbaveTjr45JUdQn",
                "http://xxx.yyy.com",
                500,
                TEST_DOCUMENT_ID5,
                {
                    value: utils.parseEther("1"),
                }
            )

        const afterBalance = await vwblGateway.provider.getBalance(vwblGateway.address)
        assert.deepEqual(afterBalance.sub(beforeBalance).eq(utils.parseEther("1.0")), true)

        const createdToken = await accessControlCheckerByNFT.documentIdToToken(TEST_DOCUMENT_ID5)
        assert.equal(createdToken.contractAddress, vwblMetadata.address)

        const isPermitted = await vwblGateway.hasAccessControl(accounts[2].address, TEST_DOCUMENT_ID5)
        assert.equal(isPermitted, true)

        const metadataURI = await vwblMetadata.tokenURI(1)
        assert.equal(metadataURI, "https://infura-ipfs.io/ipfs/QmeGAVddnBSnKc1DLE7DLV9uuTqo5F7QbaveTjr45JUdQn")
    })

    it("should not withdraw fee from not contract owner", async () => {
        await expect(vwblGateway.connect(accounts[1]).withdrawFee()).to.be.revertedWith(
            "Ownable: caller is not the owner"
        )
    })

    it("should withdraw fee from contract owner", async () => {
        const beforeOwnerBalance = await vwblGateway.provider.getBalance(accounts[0].address)
        const beforeGatewayBalance = await vwblGateway.provider.getBalance(vwblGateway.address)

        await vwblGateway.connect(accounts[0]).withdrawFee()

        const afterOwnerBalance = await vwblGateway.provider.getBalance(accounts[0].address)
        const afterGatewayBalance = await vwblGateway.provider.getBalance(vwblGateway.address)
        assert.equal(afterGatewayBalance.toNumber(), 0)
        console.log("    Change of gateway contract balance:", beforeGatewayBalance.sub(afterGatewayBalance).toString())
        console.log("    Change of contract owner balance: ", afterOwnerBalance.sub(beforeOwnerBalance).toString())
    })

    it("should not set feeWei from not contract owner", async () => {
        await expect(vwblGateway.connect(accounts[1]).setFeeWei(utils.parseEther("2"))).to.be.revertedWith(
            "Ownable: caller is not the owner"
        )
    })

    it("should set feeWei from contract owner", async () => {
        const oldFeeWei = await vwblGateway.feeWei()
        assert.equal(oldFeeWei.toString(), utils.parseEther("1"))

        await vwblGateway.connect(accounts[0]).setFeeWei(utils.parseEther("2"))

        const newFeeWei = await vwblGateway.feeWei()
        assert.equal(newFeeWei.toString(), utils.parseEther("2"))
    })

    it("should not set VWBLGateway contract from not contract owner", async () => {
        await expect(gatewayProxy.connect(accounts[1]).setGatewayAddress(accounts[4].address)).to.be.revertedWith(
            "Ownable: caller is not the owner"
        )

        await expect(gatewayProxy.connect(accounts[1]).setGatewayAddress(accounts[5].address)).to.be.revertedWith(
            "Ownable: caller is not the owner"
        )
    })

    it("should set VWBLGateway contract from contract owner", async () => {
        await gatewayProxy.connect(accounts[0]).setGatewayAddress(accounts[4].address)
        let newContract = await gatewayProxy.getGatewayAddress()
        assert.equal(newContract, accounts[4].address)

        await gatewayProxy.connect(accounts[0]).setGatewayAddress(accounts[5].address)
        newContract = await gatewayProxy.getGatewayAddress()
        assert.equal(newContract, accounts[5].address)
    })

    it("should not set Access check contract from not contract owner", async () => {
        await expect(vwblERC721.connect(accounts[1]).setAccessCheckerContract(accounts[4].address)).to.be.revertedWith(
            "Ownable: caller is not the owner"
        )
    })

    it("should set Access check contract from contract owner", async () => {
        await vwblERC721.connect(accounts[0]).setAccessCheckerContract(accounts[4].address)
        const newContract = await vwblERC721.accessCheckerContract()
        assert.equal(newContract, accounts[4].address)
    })
})

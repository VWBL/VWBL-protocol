import { expect, assert } from "chai"
import hre, { ethers } from "hardhat"
import { DeploymentInfo, deployContracts, fee, ONE_GWEI } from "./lib/deployContractsGateway"
import { parseEther } from "ethers"

describe("VWBLGatewayV2", function () {
    let accounts: any
    let deploymentInfo: DeploymentInfo

    const TEST_DOCUMENT_ID1 = "0xac00000000000000000000000000000000000000000000000000000000000000"
    const TEST_DOCUMENT_ID2 = "0xbc00000000000000000000000000000000000000000000000000000000000000"
    const TEST_DOCUMENT_ID3 = "0xcc00000000000000000000000000000000000000000000000000000000000000"
    const TEST_DOCUMENT_ID4 = "0xdc00000000000000000000000000000000000000000000000000000000000000"
    const TEST_DOCUMENT_ID5 = "0xec00000000000000000000000000000000000000000000000000000000000000"
    const fee = parseEther("1.0")

    before(async function () {
        accounts = await hre.ethers.getSigners()
    })

    it("should deploy", async () => {
        deploymentInfo = await deployContracts(accounts[0], accounts[0].address)
    })

    // 特定のユーザーがアクセス権を持っていないことを確認
    it("should return false from hasAccessControl", async () => {
        const { vwblGatewayv2 } = await deploymentInfo
        const isPermitted = await vwblGatewayv2.hasAccessControl(accounts[1].address, TEST_DOCUMENT_ID1)
        assert.equal(isPermitted, false)
    })

    it("should mint nft", async () => {
        const { vwblGatewayv2, vwblERC721, accessControlCheckerByNFT } = deploymentInfo
        await vwblERC721.connect(accounts[1]).mint(
            "http://xxx.yyy.com",
            100,
            TEST_DOCUMENT_ID1,
            {
                value: ONE_GWEI,
            }
        )
        const createdToken = await accessControlCheckerByNFT.documentIdToToken(TEST_DOCUMENT_ID1)
        assert.equal(createdToken.contractAddress, await vwblERC721.getAddress())
        await vwblERC721.connect(accounts[1]).transferFrom(accounts[1].address, accounts[2].address, 1)
        
        const isMinterHasAccess = await vwblGatewayv2.hasAccessControl(accounts[1].address, TEST_DOCUMENT_ID1)
        assert.equal(isMinterHasAccess, true)
        const isMinterHasSetKey = await vwblGatewayv2.hasSetKeyRights(accounts[1].address, TEST_DOCUMENT_ID1);
        assert.equal(isMinterHasSetKey, true)
        const isOwnerHasAccess = await vwblGatewayv2.hasAccessControl(accounts[2].address, TEST_DOCUMENT_ID1)
        assert.equal(isOwnerHasAccess, true)
        const isOwnerHasSetKey = await vwblGatewayv2.hasSetKeyRights(accounts[2].address, TEST_DOCUMENT_ID1);
        assert.equal(isOwnerHasSetKey, true);
    })

    it("should minter has only set key right", async() => {
        const { vwblGatewayv2, vwblERC721, accessControlCheckerByNFTOnlySetkey } = deploymentInfo
        await vwblERC721.connect(accounts[0]).setAccessCheckerContract(await accessControlCheckerByNFTOnlySetkey.getAddress());
        await vwblERC721.connect(accounts[1]).mint(
            "http://xxx.yyy.com",
            100, 
            TEST_DOCUMENT_ID2,
            {
                value: ONE_GWEI,
            }
        );
        await vwblERC721.connect(accounts[1]).transferFrom(accounts[1].address, accounts[2].address, 2)
        
        const isMinterHasAccess = await vwblGatewayv2.hasAccessControl(accounts[1].address, TEST_DOCUMENT_ID2)
        assert.equal(isMinterHasAccess, false)
        const isMinterHasSetKey = await vwblGatewayv2.hasSetKeyRights(accounts[1].address, TEST_DOCUMENT_ID2);
        assert.equal(isMinterHasSetKey, true)
        const isOwnerHasAccess = await vwblGatewayv2.hasAccessControl(accounts[2].address, TEST_DOCUMENT_ID2)
        assert.equal(isOwnerHasAccess, true)
        const isOwnerHasSetKey = await vwblGatewayv2.hasSetKeyRights(accounts[2].address, TEST_DOCUMENT_ID2);
        assert.equal(isOwnerHasSetKey, true);
    })

    it("should get nft datas", async () => {
        const { accessControlCheckerByNFT, vwblERC721, externalNFT } = deploymentInfo
        const nftDatas = await accessControlCheckerByNFT.getNFTDatas()
        assert.isTrue(nftDatas[0].includes(TEST_DOCUMENT_ID1))
        assert.equal(nftDatas[1][0].contractAddress, vwblERC721.target.toString())
        assert.equal(nftDatas[1][0].tokenId, BigInt(1))
    })

    it("should submit and confirm a transaction for registerValidatorAllocations", async function () {
        const { vwblGatewayv2, accessControlCheckerByERC1155, vwblERC721Metadata } = deploymentInfo
        const beforeBalance = await hre.ethers.provider.getBalance(await vwblGatewayv2.getAddress())
        console.log(">>>beforeBalance", beforeBalance)

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

        const afterBalance = await hre.ethers.provider.getBalance(await vwblGatewayv2.getAddress())
        console.log(">>>afterBalance", afterBalance)
        assert.deepEqual(afterBalance - beforeBalance, BigInt(ONE_GWEI))

        const createdToken = await accessControlCheckerByERC1155.documentIdToToken(TEST_DOCUMENT_ID5)
        console.log(">>>createdToken", createdToken)
        assert.equal(createdToken.contractAddress, await vwblERC721Metadata.getAddress())

        const isPermitted = await vwblGatewayv2.hasAccessControl(accounts[2].address, TEST_DOCUMENT_ID5)
        console.log(">>>isPermitted", isPermitted)
        assert.equal(isPermitted, true)

        const metadataURI = await vwblERC721Metadata.baseURI()
        console.log(">>>metadataURI", metadataURI)
        assert.equal(metadataURI, "https://infura-ipfs.io/ipfs/QmeGAVddnBSnKc1DLE7DLV9uuTqo5F7QbaveTjr45JUdQn")
    })

    // grantViewPermissionとrevokeViewPermission,getBalanceない

    it("should hasAccessControl return false when condition contract return false", async () => {
        const { accessCondition, vwblGatewayv2 } = deploymentInfo

        await accessCondition.setCondition(false)
        const isPermitted = await vwblGatewayv2.hasAccessControl(accounts[1].address, TEST_DOCUMENT_ID4)
        assert.equal(isPermitted, false)
    })

    it("should not set VWBLGateway contract from not contract owner", async () => {
        const { gatewayProxy } = deploymentInfo
        await expect(gatewayProxy.connect(accounts[1]).setGatewayAddress(accounts[4].address)).to.be.reverted
        await expect(gatewayProxy.connect(accounts[1]).setGatewayAddress(accounts[5].address)).to.be.reverted
    })
    it("should set feeWei from contract owner", async () => {
        const { vwblGatewayv2 } = deploymentInfo

        const oldFeeWei = await vwblGatewayv2.feeWei()
        assert.equal(oldFeeWei.toString(), parseEther("1").toString())

        await vwblGatewayv2.connect(accounts[0]).setFeeWei(parseEther("0"))

        const newFeeWei = await vwblGatewayv2.feeWei()
        assert.equal(newFeeWei.toString(), parseEther("0").toString())
    })
    it("should set VWBLGateway contract from contract owner", async () => {
        const { gatewayProxy } = deploymentInfo

        await gatewayProxy.connect(accounts[0]).setGatewayAddress(accounts[4].address)
        let newContract = await gatewayProxy.getGatewayAddress()
        assert.equal(newContract, accounts[4].address)

        await gatewayProxy.connect(accounts[0]).setGatewayAddress(accounts[5].address)
        newContract = await gatewayProxy.getGatewayAddress()
        assert.equal(newContract, accounts[5].address)
    })

    it("should not set Access check contract from not contract owner", async () => {
        const { vwblERC721 } = deploymentInfo
        await expect(vwblERC721.connect(accounts[1]).setAccessCheckerContract(accounts[4].address)).to.be.reverted
    })

    it("should set Access check contract from contract owner", async () => {
        const { vwblERC721 } = deploymentInfo
        await vwblERC721.connect(accounts[0]).setAccessCheckerContract(accounts[4].address)
        const newContract = await vwblERC721.accessCheckerContract()
        assert.equal(newContract, accounts[4].address)
    })

    //validators
    it("should fail to register validators without enough confirmations", async function () {
        const { validatorRegistry, validators } = deploymentInfo

        const allocations = [5000, 1666, 1666, 1666]
        const value = 0

        const data = validatorRegistry.interface.encodeFunctionData("registerValidatorAllocations", [
            validators,
            allocations,
        ])

        const submitTx = await validatorRegistry
            .connect(accounts[0])
            .submitTransaction(validatorRegistry.target, value, data)
        await submitTx.wait()

        expect(await validatorRegistry.getActiveValidatorCount()).to.equal(0)
    })

    it("should successfully register validators", async function () {
        const { validatorRegistry, validators } = deploymentInfo

        const allocations = [5000, 1666, 1666, 1666]
        const value = 0
        const data = validatorRegistry.interface.encodeFunctionData("registerValidatorAllocations", [
            validators,
            allocations,
        ])
        const submitTx = await validatorRegistry
            .connect(accounts[0])
            .submitTransaction(validatorRegistry.target, value, data)
        await submitTx.wait()

        const confirmTx1 = await validatorRegistry.connect(accounts[1]).confirmTransaction(1)
        await confirmTx1.wait()

        expect(await validatorRegistry.getActiveValidatorCount()).to.equal(4)
        expect(await validatorRegistry.isActiveValidator(accounts[1].address)).to.be.true
        expect(await validatorRegistry.validatorToAllocationNumerator(accounts[0].address)).to.equal(5000)
    })

    it("should allow owner to set new fee", async function () {
        const { vwblGatewayv2 } = deploymentInfo
        const newFee = ethers.parseEther("2")
        await vwblGatewayv2.setFeeWei(newFee)
        expect(await deploymentInfo.vwblGatewayv2.feeWei()).to.equal(newFee)
    })
})

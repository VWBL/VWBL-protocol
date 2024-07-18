import { expect, assert } from "chai"
import hre, { ethers } from "hardhat"
import { DeploymentInfo, deployContracts, fee, ONE_GWEI } from "./lib/deployContractsGateway"
import { decodeBytes32String } from "ethers"

describe("VWBLGatewayV2 Contract", function () {
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

    // コントラクトのデプロイメントをテスト
    it("should deploy", async () => {
        deploymentInfo = await deployContracts(accounts[0], accounts[0].address)
    })

    // 特定のユーザーがアクセス権を持っていないことを確認
    it("should return false from hasAccessControl", async () => {
        const { vwblGateway } = await deploymentInfo
        const isPermitted = await vwblGateway.hasAccessControl(accounts[1].address, TEST_DOCUMENT_ID1)
        assert.equal(isPermitted, false)
    })

    //  NFTをミントし、関連する情報が正しく設定されているかを確認
    it("should mint nft", async () => {
        const { vwblGateway, vwblERC1155ERC2981, accessControlCheckerByERC1155 } = deploymentInfo
        await vwblERC1155ERC2981.connect(accounts[1]).mint(
            "http://xxx.yyy.com",
            100, // token amount
            500, // royalty = 5%
            TEST_DOCUMENT_ID1,
            {
                value: ONE_GWEI,
            }
        )
        const tokenIds = await vwblERC1155ERC2981.getTokenByMinter(accounts[1].address)
        const tokens = await Promise.all(
            tokenIds.map(async (id: bigint) => await vwblERC1155ERC2981.tokenIdToTokenInfo(id))
        )
        assert.equal(tokens[0].minterAddress, accounts[1].address, "Minter is not correct")
        assert.equal(tokens[0].getKeyURl, "http://xxx.yyy.com", "keyURL is not correct")

        const tokenAmount = await vwblERC1155ERC2981.balanceOf(accounts[1].address, 1)
        assert.equal(tokenAmount, BigInt(100))

        const [receiver, amount] = await vwblERC1155ERC2981.royaltyInfo(1, 10000)
        assert.equal(receiver, accounts[1].address)
        assert.equal(amount, BigInt(500))

        console.log("     accounts[1].address mint tokenId = 1, amount =", tokenAmount.toString(), " nft")

        const createdToken = await accessControlCheckerByERC1155.documentIdToToken(TEST_DOCUMENT_ID1)
        assert.equal(createdToken.contractAddress, await vwblERC1155ERC2981.getAddress())

        const isPermitted = await vwblGateway.hasAccessControl(accounts[1].address, TEST_DOCUMENT_ID1)
        assert.equal(isPermitted, true)
    })

    // 複数のNFTをミントし、それらが正しく動作するかをテスト
    it("should mint multiple nfts", async () => {
        const { vwblGateway, vwblERC1155ERC2981, accessControlCheckerByERC1155 } = deploymentInfo
        await vwblERC1155ERC2981.connect(accounts[1]).mint(
            "http://xxx.yyy.zzz.com",
            200, // token amount
            500, // royalty = 5%
            TEST_DOCUMENT_ID2,
            {
                value: ONE_GWEI,
            }
        )
        const tokenIds = await vwblERC1155ERC2981.getTokenByMinter(accounts[1].address)
        const tokens = await Promise.all(
            tokenIds.map(async (id: bigint) => await vwblERC1155ERC2981.tokenIdToTokenInfo(id))
        )
        assert.equal(tokens[1].minterAddress, accounts[1].address, "Minter is not correct")
        assert.equal(tokens[1].getKeyURl, "http://xxx.yyy.zzz.com", "keyURL is not correct")

        const tokenAmount = await vwblERC1155ERC2981.balanceOf(accounts[1].address, 2)
        assert.equal(tokenAmount, BigInt(200))

        const [receiver, amount] = await vwblERC1155ERC2981.royaltyInfo(2, 10000)
        assert.equal(receiver, accounts[1].address)
        assert.equal(amount, BigInt(500))

        console.log("     accounts[1].address mint tokenId = 2, amount =", tokenAmount.toString(), " nft")

        const createdToken = await accessControlCheckerByERC1155.documentIdToToken(TEST_DOCUMENT_ID2)
        assert.equal(createdToken.contractAddress, await vwblERC1155ERC2981.getAddress())

        const isPermitted = await vwblGateway.hasAccessControl(accounts[1].address, TEST_DOCUMENT_ID2)
        assert.equal(isPermitted, true)
    })

    // NFTの転送をテストし、残高が適切に更新されているかを確認
    it("should transfer", async () => {
        const { vwblERC1155ERC2981 } = deploymentInfo
        await vwblERC1155ERC2981
            .connect(accounts[1])
            .safeTransferFrom(accounts[1].address, accounts[2].address, 1, 10, "0x00")

        const tokenAmountOfOwner1 = await vwblERC1155ERC2981.balanceOf(accounts[1].address, 1)
        assert.equal(tokenAmountOfOwner1, BigInt(90))

        const tokenAmountOfOwner2 = await vwblERC1155ERC2981.balanceOf(accounts[2].address, 1)
        assert.equal(tokenAmountOfOwner2, BigInt(10))
        console.log("     accounts[1].address transfer tokenId = 1 and amount = 10 to accounts[2].address")
    })

    // 手数料を支払うことでアクセス権が与えられるか
    it("should permitted if pay fee", async () => {
        const { vwblGateway } = deploymentInfo
        const isPermittedBeforePayFee = await vwblGateway.hasAccessControl(accounts[2].address, TEST_DOCUMENT_ID1)
        assert.equal(isPermittedBeforePayFee, false)
        await vwblGateway.payFee(TEST_DOCUMENT_ID1, accounts[2].address, { value: fee })
        const isPermittedAfterPayFee = await vwblGateway.hasAccessControl(accounts[2].address, TEST_DOCUMENT_ID1)
        assert.equal(isPermittedAfterPayFee, true)
    })

    // 複数のNFTを一度に転送する操作をテスト
    it("should batch transfer", async () => {
        const { vwblERC1155ERC2981 } = deploymentInfo
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

    //  複数のNFTを一度にミントする操作がテストされる予定
    it("should batch mint nft", async () => {})

    // コントラクトの所有者以外がBaseURIを設定できないことを確認
    it("should not set BaseURI from not contract owner", async () => {
        const { vwblERC1155ERC2981 } = deploymentInfo
        await expect(
            vwblERC1155ERC2981.connect(accounts[2]).setBaseURI("http://xxx.com")
        ).to.be.revertedWithCustomError(vwblERC1155ERC2981, "OwnableUnauthorizedAccount")
    })

    // コントラクトの所有者がBaseURIを設定できることをテスト
    it("should set BaseURI from contract owner", async () => {
        const { vwblERC1155ERC2981 } = deploymentInfo
        await vwblERC1155ERC2981.connect(accounts[0]).setBaseURI("http://xxx.com")
        const baseURI = await vwblERC1155ERC2981.uri(1)
        assert.equal(baseURI, "http://xxx.com" + "1")
    })

    // コントラクトの所有者以外がアクセスチェッカーを設定できないことを確認
    it("should not set Access check contract from not contract owner", async () => {
        const { vwblERC1155ERC2981 } = deploymentInfo
        await expect(
            vwblERC1155ERC2981.connect(accounts[1]).setAccessCheckerContract(accounts[4].address)
        ).to.be.revertedWithCustomError(vwblERC1155ERC2981, "OwnableUnauthorizedAccount")
    })

    // コントラクトの所有者がアクセスチェッカーを設定できることをテスト
    it("should set Access check contract from contract owner", async () => {
        const { vwblERC1155ERC2981 } = deploymentInfo
        await vwblERC1155ERC2981.connect(accounts[0]).setAccessCheckerContract(accounts[4].address)
        const newContract = await vwblERC1155ERC2981.accessCheckerContract()
        assert.equal(newContract, accounts[4].address)
    })

    // 特定の条件下でアクセスコントロールを正しく付与できることを確認
    it("should submit and confirm a transaction for registerValidatorAllocations", async function () {
        const { vwblGateway, accessControlCheckerByERC1155, vwblERC1155Metadata } = deploymentInfo
        const beforeBalance = await hre.ethers.provider.getBalance(await vwblGateway.getAddress())
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

        const afterBalance = await hre.ethers.provider.getBalance(await vwblGateway.getAddress())
        assert.deepEqual(afterBalance - beforeBalance, BigInt(ONE_GWEI))

        const createdToken = await accessControlCheckerByERC1155.documentIdToToken(TEST_DOCUMENT_ID5)
        assert.equal(createdToken.contractAddress, await vwblERC1155Metadata.getAddress())

        const isPermitted = await vwblGateway.hasAccessControl(accounts[2].address, TEST_DOCUMENT_ID5)
        assert.equal(isPermitted, true)

        const metadataURI = await vwblERC1155Metadata.uri(1)
        assert.equal(metadataURI, "https://infura-ipfs.io/ipfs/QmeGAVddnBSnKc1DLE7DLV9uuTqo5F7QbaveTjr45JUdQn")
    })

    //validators
    it("should fail to register validators without enough confirmations", async function () {
        const allocations = [5000, 1666, 1666, 1666]
        const value = 0
        const validatorRegistry = deploymentInfo.validatorRegistry
        const validators = deploymentInfo.validators

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
        const allocations = [5000, 1666, 1666, 1666]
        const value = 0
        const validatorRegistry = deploymentInfo.validatorRegistry
        const validators = deploymentInfo.validators
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

    // vwblGatewayV2
    it("should set the correct initial fee", async function () {
        const feeWei = await deploymentInfo.vwblGatewayv2.feeWei()
        expect(feeWei).to.equal(ethers.parseEther("1"))
    })

    it("should allow owner to set new fee", async function () {
        const newFee = ethers.parseEther("2")
        await deploymentInfo.vwblGatewayv2.setFeeWei(newFee)
        expect(await deploymentInfo.vwblGatewayv2.feeWei()).to.equal(newFee)
    })

    it("should register document and mint fee correctly", async function () {
        const allId = await deploymentInfo.vwblGatewayv2.getDocumentIds()
        console.log(">>>allId", allId)
        const documentId = allId[1]
        console.log(">>>id", documentId)
        const conditionContractAddress = await deploymentInfo.vwblGatewayv2.documentIdToConditionContract(documentId)
        console.log(">>>conditionContractAddress", conditionContractAddress)
        const minter = await deploymentInfo.vwblGatewayv2.documentIdToMinter(documentId)
        console.log(">>>minter", minter)

        const pendingFee = await deploymentInfo.vwblGatewayv2.pendingFee()
        console.log(">>>pendingFee", pendingFee)
        const withdrawExtraFeeAddress = await deploymentInfo.vwblGatewayv2.withdrawExtraFeeAddress()
        console.log(">>>withdrawExtraFeeAddress", withdrawExtraFeeAddress)
        const vwblContractWallet = await deploymentInfo.vwblContractWallet.target
        console.log(">>>vwblContractWallet", vwblContractWallet)
        const account = accounts[0].address
        console.log(">>>account", accounts[0].address, accounts[1].address, accounts[2].address)

        const hasAccessControl = await deploymentInfo.vwblGatewayv2.hasAccessControl(minter, documentId)
        console.log(">>>hasAccessControl", hasAccessControl)
        const feeWei = await deploymentInfo.vwblGatewayv2.feeWei()
        // const documentId = ethers.encodeBytes32String("1")
        // const feeAmount = ethers.parseEther(feeWei)

        console.log(
            ">>>grantAccessControl",
            await deploymentInfo.vwblGatewayv2.grantAccessControl(documentId, conditionContractAddress, minter, {
                value: feeWei,
            })
        )
        await expect(
            deploymentInfo.vwblGatewayv2.grantAccessControl(documentId, conditionContractAddress, minter, {
                value: feeWei,
            })
        ).to.not.be.reverted
        // await vwblGatewayV2.grantAccessControl(documentId, addr1.address, addr2.address, {
        //     value: ethers.utils.parseEther("1"),
        // })
        expect(await deploymentInfo.vwblGatewayv2.documentIdToConditionContractV2(documentId)).to.equal(
            accounts[0].address
        )
        expect(await deploymentInfo.vwblGatewayv2.documentIdToMinterV2(documentId)).to.equal(accounts[1].address)
    })
})

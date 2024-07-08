import { expect } from "chai"
import { ethers } from "hardhat"
import { VWBLContractWallet, VWBLGatewayV2 } from "../typechain-types"
import { deployContractsGatewayV2 } from "./lib/deployContracts"

describe("VWBLContractWallet", function () {
    let vwblContractWallet: VWBLContractWallet
    let vwblGatewayV1Address: string
    let vwblGatewayV2Address: string
    let stableCoinFeeRegistry: any
    let accounts: any[]
    let testTokenAddress: string
    let deploymentInfo: any
    let owner: any

    before(async function () {
        console.log("Before hook starting")
        try {
            ;[owner, ...accounts] = await ethers.getSigners()
            if (!owner) throw new Error("Failed to get signers")
            // console.log("owner", owner)
            deploymentInfo = await deployContractsGatewayV2(owner, owner.address)
            vwblContractWallet = deploymentInfo.vwblContractWallet
            stableCoinFeeRegistry = deploymentInfo.stableCoinFeeRegistry
            vwblGatewayV1Address = deploymentInfo.vwblGatewayV1Address
            vwblGatewayV2Address = deploymentInfo.vwblGatewayV2Address
            testTokenAddress = deploymentInfo.testTokenAddress
            console.log("testTokenAddress", testTokenAddress)

        } catch (error) {
            console.error("Error in before hook:", error)
            throw error
        }
    })

    describe("Ownership and Access Control", function () {
        // 認可されていないユーザーが新しいコントラクトを登録できない
        it("should not allow unauthorized users to register a new owned contract", async function () {
            await expect(
                vwblContractWallet.connect(accounts[0]).registerOwnedContract(testTokenAddress)
            ).to.be.revertedWith("msg sender doesn't have OPERATOR_ROLE")
        })

        // 有効なオーナーによって新しい所有コントラクトを登録できるか
        it("should allow valid owners to register a new owned contract", async function () {
            await vwblContractWallet.grantRole(await vwblContractWallet.OPERATOR_ROLE(), owner.address)
            await expect(vwblContractWallet.registerOwnedContract(testTokenAddress)).to.not.be.reverted
            const ownedContracts = await vwblContractWallet.getOwnedContracts()
            expect(ownedContracts).to.include(testTokenAddress)
        })
    })

    describe("Fee Settings", function () {
        // 権限のないユーザーがネイティブトークンの手数料を設定できないことを確認
        it("should fail to set native token fee by unauthorized user", async function () {
            const newFee = ethers.parseUnits("2", "wei")
            await expect(vwblContractWallet.connect(accounts[0]).setNativeTokenFee(newFee)).to.be.revertedWith(
                "msg sender doesn't have SET_FEE_ROLE"
            )
        })
        // 権限のないユーザー手数料を設定できないことを確認
        it("should fail to set stable coin fee by unauthorized user", async function () {
            const fiatIndex = 0
            const newFeeNumerator = 2000
            await expect(
                vwblContractWallet.connect(accounts[0]).setStableCoinFee(fiatIndex, newFeeNumerator)
            ).to.be.revertedWith("msg sender doesn't have SET_FEE_ROLE")
        })
        //  権限のあるユーザーがネイティブトークンの手数料を設定できることを確認
        it("should set native token fee correctly by authorized user", async function () {
            const newFee = ethers.parseUnits("1", "wei")
            await expect(vwblContractWallet.setNativeTokenFee(newFee)).to.not.be.reverted
            const gatewayV2 = await ethers.getContractAt("VWBLGatewayV2", vwblGatewayV2Address)
            const currentFee = await gatewayV2.feeWei()
            expect(currentFee).to.equal(newFee)
        })

        // 権限のあるユーザーが手数料を設定できることを確認
        it("should set stable coin fee correctly by authorized user", async function () {
            const fiatIndex = 0
            const newFeeNumerator = 1000
            await expect(vwblContractWallet.setStableCoinFee(fiatIndex, newFeeNumerator)).to.not.be.reverted

            const registry = await ethers.getContractAt("IStableCoinFeeRegistry", stableCoinFeeRegistry.address)
            const fee = await registry.feeNumerators(fiatIndex)
            expect(fee).to.equal(newFeeNumerator)
        })
    })

    describe("Stable Coin Management", function () {
        it("should allow OPERATOR_ROLE to register stable coin info", async function () {
            const fiatName = "USD"
            const erc20Addresses = [testTokenAddress]
            const decimalses = [18]
            const feeNumerator = 1000

            await expect(vwblContractWallet.registerStableCoinInfo(fiatName, erc20Addresses, decimalses, feeNumerator))
                .to.not.be.reverted

            const registry = await ethers.getContractAt("IStableCoinFeeRegistry", stableCoinFeeRegistry.address)
            const stableCoinInfo = await registry.getStableCoinInfo(0)
            expect(stableCoinInfo.fiatName).to.equal(fiatName)
        })

        it("should allow OPERATOR_ROLE to rename fiat", async function () {
            const fiatIndex = 0
            const newFiatName = "US Dollar"

            await expect(vwblContractWallet.renameFiat(fiatIndex, newFiatName)).to.not.be.reverted

            const registry = await ethers.getContractAt("IStableCoinFeeRegistry", stableCoinFeeRegistry.address)
            const fiatName = await registry.fiatNames(fiatIndex)
            expect(fiatName).to.equal(newFiatName)
        })

        it("should allow OPERATOR_ROLE to register new ERC20 addresses", async function () {
            const fiatIndex = 0
            const newERC20Addresses = [testTokenAddress]
            const decimalses = [18]

            await expect(vwblContractWallet.registerERC20Addresses(fiatIndex, newERC20Addresses, decimalses)).to.not.be
                .reverted

            const registry = await ethers.getContractAt("IStableCoinFeeRegistry", stableCoinFeeRegistry.address)
            const erc20Address = await registry.erc20Addresses(fiatIndex, 0)
            expect(erc20Address).to.equal(testTokenAddress)
        })

        it("should allow OPERATOR_ROLE to unregister ERC20 addresses", async function () {
            const fiatIndex = 0
            const erc20Address = testTokenAddress

            await expect(vwblContractWallet.unregisterERC20Address(fiatIndex, erc20Address)).to.not.be.reverted

            const registry = await ethers.getContractAt("IStableCoinFeeRegistry", stableCoinFeeRegistry.address)
            const erc20Addresses = await registry.getERC20Addresses(fiatIndex)
            expect(erc20Addresses).to.not.include(erc20Address)
        })
    })
    describe("Recipient Management", function () {
        it("should allow OPERATOR_ROLE to set recipient", async function () {
            const srcAddress = accounts[0].address
            const recipient = accounts[1].address

            await expect(vwblContractWallet.setRecipient(srcAddress, recipient)).to.not.be.reverted

            const withdrawExtraFeeAddress = await vwblContractWallet.withdrawExtraFeeAddress() // ここに await を追加
            const withdrawExtraFee = await ethers.getContractAt("IWithdrawExtraFee", withdrawExtraFeeAddress)
            const recipientAddress = await withdrawExtraFee.recipients(srcAddress)
            expect(recipientAddress).to.equal(recipient)
        })
    })

    describe("Stable Coin Fee Registry Management", function () {
        it("should allow OPERATOR_ROLE to set new stable coin fee registry address", async function () {
            const newScFeeRegistryAddress = accounts[1].address
            await expect(vwblContractWallet.setStableCoinFeeRegistry(newScFeeRegistryAddress)).to.not.be.reverted

            const currentAddress = await vwblContractWallet.scFeeRegistryAddress()
            expect(currentAddress).to.equal(newScFeeRegistryAddress)
        })
    })
})

import { expect } from "chai"
import hre, { ethers } from "hardhat"

import { VWBLContractWallet } from "../typechain-types"
import { deployContractsGatewayV2 } from "./lib/deployContracts"

describe("VWBLContractWallet", function () {
    let deploymentInfo: any
    let vwblContractWallet: VWBLContractWallet
    let accounts: any[]
    let registries: any[]

    const newFeeNumerator = 1500
    const newFeeWei = ethers.parseEther("0.001")
    before(async function () {
        deploymentInfo = await deployContractsGatewayV2()
        vwblContractWallet = deploymentInfo.vwblContractWallet
        accounts = deploymentInfo.accounts
        registries = [
            { registry: deploymentInfo.stableCoinFeeRegistry, name: "stableCoinFeeRegistry" },
            { registry: deploymentInfo.withdrawExtraFeeRegistry, name: "withdrawExtraFeeRegistry" },
            { registry: deploymentInfo.vwblGatewayV1Registry, name: "vwblGatewayV1Registry" },
            { registry: deploymentInfo.vwblGatewayV2Registry, name: "vwblGatewayV2Registry" },
        ]
    })

    describe("Ownership and Access Control Tests", function () {
        it("should handle ownership transfers and contract registration correctly for all registries", async function () {
            for (const { registry, name } of registries) {
                console.log(`Testing ${name}`)

                // Test transfer ownership
                // 所有権移譲のテスト: 非所有者による移譲を試み、失敗を確認
                await expect(
                    registry.connect(accounts[1]).transferOwnership(accounts[1].address)
                ).to.be.revertedWithCustomError(registry, "OwnableUnauthorizedAccount")

                // 所有者による所有権の正常な移譲をテスト
                await registry.connect(accounts[0]).transferOwnership(await vwblContractWallet.getAddress())
                expect(await registry.owner()).to.eq(await vwblContractWallet.getAddress())

                const initialOwnedContracts = await vwblContractWallet.getOwnedContracts()
                await vwblContractWallet
                    .connect(accounts[0])
                    .registerOwnedContract(await registry.getAddress(), { gasLimit: 1000000 })

                // 登録後の所有コントラクトリストを確認し、正しく登録されているかを検証
                const finalOwnedContracts = await vwblContractWallet.getOwnedContracts()
                const isRegistered = finalOwnedContracts.includes(await registry.getAddress())
                expect(isRegistered).to.be.true
                expect(finalOwnedContracts.length).to.equal(initialOwnedContracts.length + 1)
            }
        })
    })
    describe("Stable Coin Fee Registry Operations", function () {
        const fiatIndex = 0 // Example index
        const fiatName = "USD"
        const newFiatName = "EUR"
        const erc20Addresses = [ethers.Wallet.createRandom().address]
        const newERC20Addresses = [ethers.Wallet.createRandom().address]
        const decimalses = [18]
        const feeNumerator = 1000
        // VWBLContractWallet異常系
        // revertedWith
        it("should fail to set the native token fee with unauthorized account", async function () {
            // `SET_FEE_ROLE`を持たないアカウントがネイティブトークンの手数料を設定しようとする
            await expect(vwblContractWallet.connect(accounts[1]).setNativeTokenFee(newFeeWei)).to.be.revertedWith(
                "msg sender doesn't have SET_FEE_ROLE"
            )
        })
        // setStableCoinFee
        it("should fail to set a stable coin fee with unauthorized account", async function () {
            // `SET_FEE_ROLE`を持たないアカウントがステーブルコインの手数料分子を設定しようとする
            await expect(
                vwblContractWallet.connect(accounts[1]).setStableCoinFee(fiatIndex, newFeeNumerator)
            ).to.be.revertedWith("msg sender doesn't have SET_FEE_ROLE")
        })
        // registerStableCoinInfo
        it("should fail to register stable coin info with unauthorized account", async function () {
            // Attempt to register stable coin info with an unauthorized account
            await expect(
                vwblContractWallet
                    .connect(accounts[1]) // Assuming accounts[1] does not have the OPERATOR_ROLE
                    .registerStableCoinInfo(fiatName, erc20Addresses, decimalses, feeNumerator)
            ).to.be.revertedWith("msg sender doesn't have OPERATOR_ROLE")
        })

        // renameFiat
        it("should fail to rename fiat currency with unauthorized account", async function () {
            // Attempt to rename fiat currency with an unauthorized account
            await expect(vwblContractWallet.connect(accounts[1]).renameFiat(fiatIndex, newFiatName)).to.be.revertedWith(
                "msg sender doesn't have OPERATOR_ROLE"
            )
        })

        // registerERC20Addresses
        it("should fail to register new ERC20 addresses with unauthorized account", async function () {
            // Attempt to register new ERC20 addresses with an unauthorized account
            await expect(
                vwblContractWallet.connect(accounts[1]).registerERC20Addresses(fiatIndex, newERC20Addresses, decimalses)
            ).to.be.revertedWith("msg sender doesn't have OPERATOR_ROLE")
        })

        // unregisterERC20Address
        it("should fail to unregister an ERC20 address with unauthorized account", async function () {
            // Attempt to unregister an ERC20 address with an unauthorized account
            await expect(
                vwblContractWallet.connect(accounts[1]).unregisterERC20Address(fiatIndex, erc20Addresses[0])
            ).to.be.revertedWith("msg sender doesn't have OPERATOR_ROLE")
        })

        // setRecipient
        it("should fail to set recipient address with unauthorized account", async function () {
            const srcAddress = accounts[1].address
            const recipient = accounts[2].address

            // Attempt to set recipient for source address with an unauthorized account
            await expect(
                vwblContractWallet.connect(accounts[2]).setRecipient(srcAddress, recipient)
            ).to.be.revertedWith("msg sender doesn't have OPERATOR_ROLE")
        })

        // setStableCoinFeeRegistry
        it("should fail to update the Stable Coin Fee Registry address with unauthorized account", async function () {
            const newScFeeRegistryAddress = ethers.Wallet.createRandom().address

            // Attempt to update the Stable Coin Fee Registry address with an unauthorized account
            await expect(
                vwblContractWallet.connect(accounts[1]).setStableCoinFeeRegistry(newScFeeRegistryAddress)
            ).to.be.revertedWith("msg sender doesn't have OPERATOR_ROLE")
        })
    })

    describe("VWBLContractWallet - Positive Cases", function () {
        let fiatIndex: any
        let fiatName: any
        let newFiatName: any
        let erc20Addresses: any
        let newERC20Addresses: any
        let decimalses: any
        let feeNumerator: any
        beforeEach(async function () {
            fiatIndex = 0
            fiatName = "USD"
            newFiatName = "EUR"
            erc20Addresses = [ethers.Wallet.createRandom().address]
            newERC20Addresses = [ethers.Wallet.createRandom().address]
            decimalses = [18]
            feeNumerator = 1000
            const registeredTokens = await registries[0].registry.getRegisteredTokens()
            console.log("registeredTokens:>>>>>>>", registeredTokens)
            console.log("erc20Addresses:>>>>>>>", erc20Addresses)
        })

        // setNativeTokenFee
        it("should set the native token fee successfully", async function () {
            await vwblContractWallet.setNativeTokenFee(newFeeWei)
        })

        // setStableCoinFee
        it("should set a stable coin fee successfully", async function () {
            await expect(vwblContractWallet.setStableCoinFee(fiatIndex, newFeeNumerator)).to.not.be.reverted
        })
        // registerStableCoinInfo
        it("should register stable coin info successfully", async function () {
            await expect(vwblContractWallet.registerStableCoinInfo(fiatName, erc20Addresses, decimalses, feeNumerator))
                .to.not.be.reverted
        })
        // renameFiat
        it("should rename fiat currency successfully", async function () {
            await vwblContractWallet.registerStableCoinInfo(fiatName, erc20Addresses, decimalses, feeNumerator)
            await vwblContractWallet.renameFiat(fiatIndex, newFiatName)
        })

        // registerERC20Addresses
        it("should register new ERC20 addresses successfully", async function () {
            for (const address of newERC20Addresses) {
                expect(await registries[0].registry.registered(address)).to.be.false
            }
            await vwblContractWallet.registerERC20Addresses(fiatIndex, erc20Addresses, decimalses)
        })

        // unregisterERC20Address
        it("should unregister an ERC20 address successfully", async function () {
            await vwblContractWallet.registerERC20Addresses(fiatIndex, erc20Addresses, decimalses)
            const registeredTokens = await registries[0].registry.getRegisteredTokens()
            console.log("registeredTokens:>>>>>>>", registeredTokens)
            await vwblContractWallet.unregisterERC20Address(1, "0xbb472b290f661295d0e8702e85c7de22026e9d1e")
        })

        // setRecipient
        it("should set recipient successfully", async function () {
            const srcAddress = ethers.Wallet.createRandom().address
            const recipient = ethers.Wallet.createRandom().address

            await expect(vwblContractWallet.setRecipient(srcAddress, recipient)).to.not.be.reverted
        })

        // setStableCoinFeeRegistry
        it("should set Stable Coin Fee Registry address successfully", async function () {
            const newScFeeRegistryAddress = ethers.Wallet.createRandom().address

            await expect(vwblContractWallet.setStableCoinFeeRegistry(newScFeeRegistryAddress))
                .to.emit(vwblContractWallet, "stableCoinFeeRegistryChanged")
                .withArgs(registries[0].registry, newScFeeRegistryAddress)

            // アドレスが正しく更新されたか確認
            expect(await vwblContractWallet.scFeeRegistryAddress()).to.equal(newScFeeRegistryAddress)
        })
    })
})

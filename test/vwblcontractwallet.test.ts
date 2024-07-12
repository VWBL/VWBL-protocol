import { expect } from "chai"
import { ethers } from "hardhat"

import { VWBLContractWallet } from "../typechain-types"
import { deployContractsGatewayV2 } from "./lib/deployContracts"
import { ZeroAddress } from "ethers"

describe("VWBLContractWallet", function () {
    interface Registries {
        stableCoinFeeRegistry: any
        withdrawExtraFeeRegistry: any
        vwblGatewayV1Registry: any
        vwblGatewayV2Registry: any
    }
    let deploymentInfo: any
    let vwblContractWallet: VWBLContractWallet
    let accounts: any[]
    let registries: Registries
    const newFeeNumerator = 1500
    const newFeeWei = ethers.parseEther("0.001")
    before(async function () {
        deploymentInfo = await deployContractsGatewayV2()
        vwblContractWallet = deploymentInfo.vwblContractWallet
        accounts = deploymentInfo.accounts

        registries = {
            stableCoinFeeRegistry: deploymentInfo.stableCoinFeeRegistry,
            withdrawExtraFeeRegistry: deploymentInfo.withdrawExtraFeeRegistry,
            vwblGatewayV1Registry: deploymentInfo.vwblGatewayV1Registry,
            vwblGatewayV2Registry: deploymentInfo.vwblGatewayV2Registry,
        }
        console.log(accounts[0].address)
    })

    describe("Ownership and Access Control Tests", function () {
        it("should handle ownership transfers and contract registration correctly for all registries", async function () {
            // 各レジストリのテスト
            for (const [name, registry] of Object.entries(registries)) {
                console.log(`Testing ${name}`)

                // 所有権移譲のテスト: 非所有者による移譲を試み、失敗を確認
                await expect(
                    registry.connect(accounts[1]).transferOwnership(accounts[1].address)
                ).to.be.revertedWithCustomError(registry, "OwnableUnauthorizedAccount")

                // 所有者による所有権の正常な移譲をテスト
                await registry.connect(accounts[0]).transferOwnership(await vwblContractWallet.getAddress())
                expect(await registry.owner()).to.eq(await vwblContractWallet.getAddress())

                // コントラクト登録のテスト
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
            console.log("All tests for ownership and access control completed successfully.")
        })
    })

    // VWBLContractWallet異常系
    describe("VWBLContractWallet - Negative Cases", function () {
        const fiatIndex = 1
        const fiatName = "USD"
        const newFiatName = "EUR"
        const erc20Addresses = [ethers.Wallet.createRandom().address]
        const newERC20Addresses = [ethers.Wallet.createRandom().address]
        const decimalses = [18]
        const feeNumerator = 1000

        // transferOwnerships
        it("should fail to transferOwnerships", async function () {
            await expect(vwblContractWallet.transferOwnerships(accounts[0].address)).to.be.reverted
        })

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

        // onlyMultiSigWalletにより失敗するケース
        it("should fail to add an owner if not called by the wallet itself", async function () {
            await expect(vwblContractWallet.connect(accounts[1]).addOwner(accounts[0].address)).to.be.reverted
        })

        // 既存のオーナーを再度追加しようとして失敗
        it("should fail to add an owner if the owner already exists", async function () {
            // await vwblContractWallet.addOwner(accounts[0].address) // 追加
            // await expect(vwblContractWallet.addOwner(accounts[0].address)).to.be.revertedWith("Owner already exists")
        })

        // notNullにより失敗するケース
        it("should fail to add a null address as an owner", async function () {
            await expect(vwblContractWallet.addOwner("0x0000000000000000000000000000000000000000")).to.be.reverted
        })
        // validRequirementに違反して失敗するケース
        it("should fail to add an owner if it violates the requirements", async function () {
            // const MAX_OWNER_COUNT = 50 // この値は実際のコントラクト定義に依存
            // for (let i = 1; i <= MAX_OWNER_COUNT; i++) {
            //     await vwblContractWallet.addOwner(accounts[i].address) // MAX_OWNER_COUNTまで追加
            // }
            // await expect(vwblContractWallet.addOwner(accounts[MAX_OWNER_COUNT + 1].address)).to.be.revertedWith(
            //     "Invalid owner count or requirements"
            // )
        })

        // removeOwner
        it("should fail to remove an owner if not called by the wallet itself", async function () {
            await expect(vwblContractWallet.connect(accounts[1]).removeOwner(accounts[0].address)).to.be.reverted
        })

        it("should fail to remove an owner if the owner does not exist", async function () {
            await expect(vwblContractWallet.removeOwner(accounts[2].address)).to.be.reverted
        })

        // replaceOwner
        it("should fail to replace an owner if not called by the wallet itself", async function () {
            // onlyMultiSigWalletの検証
            await expect(vwblContractWallet.connect(accounts[2]).replaceOwner(accounts[0].address, accounts[1].address))
                .to.be.reverted
        })

        it("should fail to replace an owner if the owner does not exist", async function () {
            // ownerExistsの検証
            await expect(vwblContractWallet.connect(accounts[2]).replaceOwner(accounts[3].address, accounts[2].address))
                .to.be.reverted
        })

        it("should fail to replace an owner with a new owner who is already an owner", async function () {
            // ownerDoesNotExistの検証
        })

        // changeRequirement
        it("should fail to change requirements if not called by the wallet itself", async function () {
            // onlyMultiSigWalletの検証
        })

        it("should fail to change requirements if the required number of confirmations is zero", async function () {
            // validRequirementの検証：_requiredが0
            await expect(vwblContractWallet.connect(accounts[2]).changeRequirement(0)).to.be.reverted
        })

        it("should fail to change requirements if the required number of confirmations exceeds the number of owners", async function () {
            // validRequirementの検証：_requiredがオーナー数より多い
            const numberOfOwners = await vwblContractWallet.getOwners()
            await expect(vwblContractWallet.changeRequirement(numberOfOwners.length)).to.be.reverted
        })
    })
    // VWBLContractWallet正常系
    describe("VWBLContractWallet - Positive Cases", function () {
        const fiatIndex = 1
        const fiatName = "USD"
        const newFiatName = "EUR"
        const erc20Addresses = [ethers.Wallet.createRandom().address]
        const newERC20Addresses = [ethers.Wallet.createRandom().address]
        const decimalses = [18]
        const feeNumerator = 1000

        // setNativeTokenFee
        it("should set the native token fee successfully", async function () {
            // 初期値を取得
            const initialFeeWeiV1 = await registries.vwblGatewayV1Registry.feeWei()
            const initialFeeWeiV2 = await registries.vwblGatewayV2Registry.feeWei()
            await vwblContractWallet.setNativeTokenFee(newFeeWei)
            // 新しい手数料を取得
            const updatedFeeWeiV1 = await registries.vwblGatewayV1Registry.feeWei()
            const updatedFeeWeiV2 = await registries.vwblGatewayV2Registry.feeWei()
            // 初期値と更新後の値を比較
            expect(updatedFeeWeiV1).to.not.equal(initialFeeWeiV1)
            expect(updatedFeeWeiV1).to.equal(newFeeWei)
            expect(updatedFeeWeiV2).to.not.equal(initialFeeWeiV2)
            expect(updatedFeeWeiV2).to.equal(newFeeWei)
        })

        // setStableCoinFee
        it("should set a stable coin fee successfully", async function () {
            await expect(vwblContractWallet.setStableCoinFee(0, newFeeNumerator)).to.not.be.reverted
        })
        // registerStableCoinInfo
        it("should register stable coin info successfully", async function () {
            await expect(vwblContractWallet.registerStableCoinInfo(fiatName, erc20Addresses, decimalses, feeNumerator))
                .to.not.be.reverted
        })
        it("should rename fiat currency successfully", async function () {
            await vwblContractWallet.renameFiat(1, newFiatName)
            const postRenameInfo = await registries.stableCoinFeeRegistry.getStableCoinInfos()
            expect(postRenameInfo[0][0]).to.equal(newFiatName)
        })

        // registerERC20Addresses
        it("should register new ERC20 addresses successfully", async function () {
            await vwblContractWallet.registerERC20Addresses(fiatIndex, newERC20Addresses, decimalses)
        })

        // unregisterERC20Address
        it("should unregister an ERC20 address successfully", async function () {
            const initialTokenInfo = await registries.stableCoinFeeRegistry.getStableCoinInfos()
            const ERC20Address = initialTokenInfo[0][1][0]
            await vwblContractWallet.unregisterERC20Address(1, ERC20Address)
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
                .withArgs(registries.stableCoinFeeRegistry, newScFeeRegistryAddress)
            expect(await vwblContractWallet.scFeeRegistryAddress()).to.equal(newScFeeRegistryAddress)
        })
        // getOwners
        it("getTransactionCount", async function () {
            const count = await vwblContractWallet.getOwners()
            expect(count.length).to.equal(3)
        })
        // getTransactionCount
        it("getTransactionCount", async function () {
            let count = await vwblContractWallet.getTransactionCount(true, true)
            console.log("getOwnersCount>>>", count)
        })

        //submitTransaction
        it("should submit and confirm a transaction", async function () {
            // アカウントの設定
            const recipient = await ethers.getSigners()
            const destination = recipient[0].address
            const value = ethers.parseEther("1.0") // 1 EtherをWeiに変換
            const data = "0x" // 空のバイト列
            try {
                const txResponse = await vwblContractWallet
                    .connect(accounts[0])
                    .submitTransaction(destination, value, data)
                // const txResponse = await vwblContractWallet.submitTransaction(destination, value, data)
                await txResponse.wait()
                // console.log("txResponse", txResponse)
                const ConfirmationCount1 = await vwblContractWallet.getConfirmationCount(0)
                console.log("ConfirmationCount", ConfirmationCount1)
                await vwblContractWallet.revokeConfirmation(0)
                const ConfirmationCount2 = await vwblContractWallet.getConfirmationCount(0)
                console.log("ConfirmationCount2", ConfirmationCount2)
            } catch (error) {
                console.error("Error during transaction:", error)
            }
            const isConfirmed = await vwblContractWallet.isConfirmed(0)
            console.log("isConfirmed", isConfirmed)
            const ConfirmationCount = await vwblContractWallet.getConfirmationCount(0)
            console.log("ConfirmationCount", ConfirmationCount)
        })
        //submitTransaction
        it("should submit and confirm a transaction", async function () {
            // アカウントの設定
            const recipient = await ethers.getSigners()
            const destination = recipient[1].address
            const value = ethers.parseEther("1.0") // 1 EtherをWeiに変換
            const data = "0x" // 空のバイト列
            try {
                const txResponse = await vwblContractWallet
                    .connect(accounts[0])
                    .submitTransaction(destination, value, data)
                await txResponse.wait()
                console.log("ConfirmationCount1", await vwblContractWallet.getConfirmationCount(1))
                await vwblContractWallet.connect(accounts[1]).confirmTransaction(1)
                console.log("ConfirmationCount2", await vwblContractWallet.getConfirmationCount(1))
            } catch (error) {
                console.error("Error during transaction:", error)
            }
            const isConfirmed = await vwblContractWallet.isConfirmed(1)
            console.log("isConfirmed", isConfirmed)
            const ConfirmationCount = await vwblContractWallet.getConfirmationCount(1)
            console.log("ConfirmationCount", ConfirmationCount)
        })
    })
})

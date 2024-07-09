import { expect } from "chai" // Chaiのexpect関数をインポート
import { ethers } from "hardhat" // Hardhatのethersをインポート
import { VWBLContractWallet, VWBLGatewayV2 } from "../typechain-types" // タイプ定義のインポート
import { deployContractsGatewayV2 } from "./lib/deployContracts" // デプロイ関数のインポート

describe("VWBLContractWallet", function () {
    let stableCoinFeeRegistry: any // stableCoinFeeRegistryのインスタンスを格納
    let withdrawExtraFeeRegistry: any // withdrawExtraFeeRegistryのインスタンスを格納
    let vwblGatewayV1Registry: any // vwblGatewayV1Registryのインスタンスを格納
    let vwblGatewayV2Registry: any // vwblGatewayV2Registryのインスタンスを格納
    let GatewayProxyRegistry: any // GatewayProxyRegistryのインスタンスを格納
    let vwblContractWallet: VWBLContractWallet // VWBLContractWalletのインスタンスを格納
    let accounts: any[] // アカウント情報を格納
    let testTokenAddress: string // テストトークンのアドレスを格納
    let deploymentInfo: any // デプロイ情報を格納

    before(async function () {
        console.log("Before hook starting")
        try {
            // デプロイ
            deploymentInfo = await deployContractsGatewayV2()
            // デプロイ結果を各変数に設定
            stableCoinFeeRegistry = deploymentInfo.stableCoinFeeRegistry
            withdrawExtraFeeRegistry = deploymentInfo.withdrawExtraFeeRegistry
            vwblGatewayV1Registry = deploymentInfo.vwblGatewayV1Registry
            vwblGatewayV2Registry = deploymentInfo.vwblGatewayV2Registry
            GatewayProxyRegistry = deploymentInfo.vwblGatewayV2Registry
            vwblContractWallet = deploymentInfo.vwblContractWallet
            accounts = deploymentInfo.accounts
            testTokenAddress = deploymentInfo.testTokenAddress
            console.log(">>>stableCoinFeeRegistry", stableCoinFeeRegistry)
        } catch (error) {
            console.error("Error in before hook:", error) // エラーが発生した場合にログ出力
            throw error
        }
    })

    describe("Ownership and Access Control", function () {
        // stableCoinFeeRegistryに関するテスト
        it("should not allow a non-contract owner to transfer ownership of stableCoinFeeRegistry", async function () {
            await expect(
                stableCoinFeeRegistry.connect(accounts[1]).transferOwnership(accounts[1].address)
            ).to.be.revertedWithCustomError(stableCoinFeeRegistry, "OwnableUnauthorizedAccount") // オーナーでないアカウントが所有権を移転しようとするのを防ぐ
        })

        it("should allow the contract owner to transfer ownership of stableCoinFeeRegistry", async function () {
            await stableCoinFeeRegistry.connect(accounts[0]).transferOwnership(await vwblContractWallet.getAddress()) // オーナーが所有権を移転できるか確認
            const contractOwner = await stableCoinFeeRegistry.owner() // 新しいオーナーを取得
            expect(contractOwner).to.eq(await vwblContractWallet.getAddress()) // オーナーが正しく設定されているか確認
        })

        it("should allow VWBLContractWallet to register owned contracts for stableCoinFeeRegistry", async function () {
            const contractToRegister = await stableCoinFeeRegistry.getAddress() // 登録するコントラクトのアドレスを取得
            // OPERATOR_ROLEの確認と付与
            const OPERATOR_ROLE = await vwblContractWallet.OPERATOR_ROLE() // OPERATOR_ROLEを取得
            const hasRole = await vwblContractWallet.hasRole(OPERATOR_ROLE, accounts[0].address) // OPERATOR_ROLEを持っているか確認
            if (!hasRole) {
                await vwblContractWallet.grantRole(OPERATOR_ROLE, accounts[0].address) // 役割を付与
            }
            // 初期状態の確認
            const initialOwnedContracts = await vwblContractWallet.getOwnedContracts() // 初期状態の所有コントラクトを取得
            console.log("Initial owned contracts:", initialOwnedContracts)
            try {
                const tx = await vwblContractWallet
                    .connect(accounts[0])
                    .registerOwnedContract(contractToRegister, { gasLimit: 1000000 }) // コントラクトを登録

                // 登録後の状態確認
                const finalOwnedContracts = await vwblContractWallet.getOwnedContracts() // 最終状態の所有コントラクトを取得
                const isRegistered = finalOwnedContracts.includes(contractToRegister) // 登録されているか確認
                expect(isRegistered).to.be.true // 登録が成功したか確認
                expect(finalOwnedContracts.length).to.equal(initialOwnedContracts.length + 1) // 登録後のコントラクト数が増えているか確認
            } catch (error: any) {
                console.error("Detailed error:", error) // エラーが発生した場合にログ出力
                throw error
            }
        })

        // withdrawExtraFeeRegistryに関するテスト
        it("should allow the contract owner to transfer ownership of withdrawExtraFeeRegistry", async function () {
            await withdrawExtraFeeRegistry.connect(accounts[0]).transferOwnership(await vwblContractWallet.getAddress()) // オーナーが所有権を移転できるか確認
            const contractOwner = await withdrawExtraFeeRegistry.owner() // 新しいオーナーを取得
            expect(contractOwner).to.eq(await vwblContractWallet.getAddress()) // オーナーが正しく設定されているか確認
        })

        it("should allow VWBLContractWallet to register owned contracts for withdrawExtraFeeRegistry", async function () {
            const contractToRegister = await withdrawExtraFeeRegistry.getAddress() // 登録するコントラクトのアドレスを取得

            // OPERATOR_ROLEの確認と付与
            const OPERATOR_ROLE = await vwblContractWallet.OPERATOR_ROLE() // OPERATOR_ROLEを取得
            const hasRole = await vwblContractWallet.hasRole(OPERATOR_ROLE, accounts[0].address) // OPERATOR_ROLEを持っているか確認
            console.log("Caller has OPERATOR_ROLE:", hasRole)
            if (!hasRole) {
                await vwblContractWallet.grantRole(OPERATOR_ROLE, accounts[0].address) // 役割を付与
            }

            // 初期状態の確認
            const initialOwnedContracts = await vwblContractWallet.getOwnedContracts() // 初期状態の所有コントラクトを取得
            console.log("Initial owned contracts:", initialOwnedContracts)

            try {
                const tx = await vwblContractWallet
                    .connect(accounts[0])
                    .registerOwnedContract(contractToRegister, { gasLimit: 1000000 }) // コントラクトを登録

                // 登録後の状態確認
                const finalOwnedContracts = await vwblContractWallet.getOwnedContracts() // 最終状態の所有コントラクトを取得
                console.log("Final owned contracts:", finalOwnedContracts)
                const isRegistered = finalOwnedContracts.includes(contractToRegister) // 登録されているか確認
                expect(isRegistered).to.be.true // 登録が成功したか確認
                expect(finalOwnedContracts.length).to.equal(initialOwnedContracts.length + 1) // 登録後のコントラクト数が増えているか確認
            } catch (error: any) {
                console.error("Detailed error:", error) // エラーが発生した場合にログ出力
                throw error
            }
        })

        // vwblGatewayV1Registryに関するテスト
        it("should allow the contract owner to transfer ownership of vwblGatewayV1Registry", async function () {
            await vwblGatewayV1Registry.connect(accounts[0]).transferOwnership(await vwblContractWallet.getAddress()) // オーナーが所有権を移転できるか確認
            const contractOwner = await vwblGatewayV1Registry.owner() // 新しいオーナーを取得
            expect(contractOwner).to.eq(await vwblContractWallet.getAddress()) // オーナーが正しく設定されているか確認
        })

        it("should allow VWBLContractWallet to register owned contracts for vwblGatewayV1Registry", async function () {
            const contractToRegister = await vwblGatewayV1Registry.getAddress() // 登録するコントラクトのアドレスを取得

            // OPERATOR_ROLEの確認と付与
            const OPERATOR_ROLE = await vwblContractWallet.OPERATOR_ROLE() // OPERATOR_ROLEを取得
            const hasRole = await vwblContractWallet.hasRole(OPERATOR_ROLE, accounts[0].address) // OPERATOR_ROLEを持っているか確認
            console.log("Caller has OPERATOR_ROLE:", hasRole)
            if (!hasRole) {
                await vwblContractWallet.grantRole(OPERATOR_ROLE, accounts[0].address) // 役割を付与
            }

            // 初期状態の確認
            const initialOwnedContracts = await vwblContractWallet.getOwnedContracts() // 初期状態の所有コントラクトを取得
            console.log("Initial owned contracts:", initialOwnedContracts)

            try {
                const tx = await vwblContractWallet
                    .connect(accounts[0])
                    .registerOwnedContract(contractToRegister, { gasLimit: 1000000 }) // コントラクトを登録
                const receipt = await tx.wait() // トランザクションの完了を待つ
                console.log("Transaction receipt:", receipt)

                // 登録後の状態確認
                const finalOwnedContracts = await vwblContractWallet.getOwnedContracts() // 最終状態の所有コントラクトを取得
                const isRegistered = finalOwnedContracts.includes(contractToRegister) // 登録されているか確認
                console.log("Is registered:", isRegistered)

                expect(isRegistered).to.be.true // 登録が成功したか確認
                expect(finalOwnedContracts.length).to.equal(initialOwnedContracts.length + 1) // 登録後のコントラクト数が増えているか確認
            } catch (error: any) {
                console.error("Detailed error:", error) // エラーが発生した場合にログ出力
                throw error
            }
        })

        // vwblGatewayV2Registryに関するテスト
        it("should allow the contract owner to transfer ownership of vwblGatewayV2Registry", async function () {
            await vwblGatewayV2Registry.connect(accounts[0]).transferOwnership(await vwblContractWallet.getAddress()) // オーナーが所有権を移転できるか確認
            const contractOwner = await vwblGatewayV2Registry.owner() // 新しいオーナーを取得
            expect(contractOwner).to.eq(await vwblContractWallet.getAddress()) // オーナーが正しく設定されているか確認
        })

        it("should allow VWBLContractWallet to register owned contracts for vwblGatewayV2Registry", async function () {
            const contractToRegister = await vwblGatewayV2Registry.getAddress() // 登録するコントラクトのアドレスを取得

            // OPERATOR_ROLEの確認と付与
            const OPERATOR_ROLE = await vwblContractWallet.OPERATOR_ROLE() // OPERATOR_ROLEを取得
            const hasRole = await vwblContractWallet.hasRole(OPERATOR_ROLE, accounts[0].address) // OPERATOR_ROLEを持っているか確認
            console.log("Caller has OPERATOR_ROLE:", hasRole)
            if (!hasRole) {
                await vwblContractWallet.grantRole(OPERATOR_ROLE, accounts[0].address) // 役割を付与
            }

            // 初期状態の確認
            const initialOwnedContracts = await vwblContractWallet.getOwnedContracts() // 初期状態の所有コントラクトを取得
            console.log("Initial owned contracts:", initialOwnedContracts)

            try {
                const tx = await vwblContractWallet
                    .connect(accounts[0])
                    .registerOwnedContract(contractToRegister, { gasLimit: 1000000 }) // コントラクトを登録
                const receipt = await tx.wait() // トランザクションの完了を待つ
                console.log("Transaction receipt:", receipt)

                // 登録後の状態確認
                const finalOwnedContracts = await vwblContractWallet.getOwnedContracts() // 最終状態の所有コントラクトを取得
                const isRegistered = finalOwnedContracts.includes(contractToRegister) // 登録されているか確認
                console.log("Is registered:", isRegistered)

                expect(isRegistered).to.be.true // 登録が成功したか確認
                expect(finalOwnedContracts.length).to.equal(initialOwnedContracts.length + 1) // 登録後のコントラクト数が増えているか確認
            } catch (error: any) {
                console.error("Detailed error:", error) // エラーが発生した場合にログ出力
                throw error
            }
        })

        // registerStableCoinInfoに関するテスト
        it("should not allow non-operator to register stable coin information", async function () {
            // テストデータを設定
            const fiatName = "USD"
            const erc20Addresses = [testTokenAddress]
            const decimalses = [18]
            const feeNumerator = 1000

            // OPERATOR_ROLEを持たないアカウントで関数を呼び出し、失敗することを確認
            await expect(
                vwblContractWallet
                    .connect(accounts[1])
                    .registerStableCoinInfo(fiatName, erc20Addresses, decimalses, feeNumerator)
            ).to.be.revertedWith("msg sender doesn't have OPERATOR_ROLE")
        })
        // registerStableCoinInfoに関するテスト
        it("should allow operator to register stable coin information", async function () {
            // テストデータを設定
            const fiatName = "USD"
            const erc20Addresses = [testTokenAddress]
            const decimalses = [18]
            const feeNumerator = 1000

            // OPERATOR_ROLEの確認と付与
            const OPERATOR_ROLE = await vwblContractWallet.OPERATOR_ROLE()
            const hasRole = await vwblContractWallet.hasRole(OPERATOR_ROLE, accounts[0].address)
            if (!hasRole) {
                await vwblContractWallet.grantRole(OPERATOR_ROLE, accounts[0].address)
            }

            // 関数を呼び出して情報を登録
            await vwblContractWallet
                .connect(accounts[0])
                .registerStableCoinInfo(fiatName, erc20Addresses, decimalses, feeNumerator)

            // 登録が成功したかどうかを確認
            try {
                // 登録されたデータを直接取得して検証
                const fiatIndex = await stableCoinFeeRegistry.erc20ToFiatIndex(testTokenAddress)
                const registeredFiatName = (await stableCoinFeeRegistry.fiatIndexToSCInfo(fiatIndex)).fiatName
                const registeredAddresses = (await stableCoinFeeRegistry.fiatIndexToSCInfo(fiatIndex)).erc20Addresses
                const registeredDecimalses = registeredAddresses.map(async (address: string) => {
                    return await stableCoinFeeRegistry.erc20ToDecimals(address)
                })
                const registeredFeeNumerator = (await stableCoinFeeRegistry.fiatIndexToSCInfo(fiatIndex)).feeNumerator

                expect(registeredFiatName).to.equal(fiatName)
                expect(registeredAddresses).to.deep.equal(erc20Addresses)
                expect(await Promise.all(registeredDecimalses)).to.deep.equal(decimalses)
                expect(registeredFeeNumerator).to.equal(feeNumerator)
            } catch (error: any) {
                console.error("Error retrieving stable coin info:", error)
                throw error
            }
        })
    })
})

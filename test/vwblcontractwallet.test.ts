import { expect } from "chai"
import { ethers } from "hardhat"
import { VWBLContractWallet } from "../typechain-types"
import { ZeroAddress } from "ethers"

describe("VWBLContractWallet", function () {
    let vwblContractWallet: VWBLContractWallet
    let testTokenAddress: string
    let accounts: string[]
    let signers: []
    let gatewayV1Address: string
    let gatewayV2Address: string
    let scFeeRegistryAddress: string
    let withdrawExtraFeeAddress: string

    before(async function () {
        const signers = await ethers.getSigners()
        accounts = signers.map((s) => s.address)

        // テスト用のダミーアドレスを使用
        testTokenAddress = ZeroAddress // "0x0000000000000000000000000000000000000000"
        // アドレスなにか
        gatewayV1Address = "V1のアドレス"
        gatewayV2Address = "V2のアドレス"
        scFeeRegistryAddress = "Stable Coin Fee Registryのアドレス"
        withdrawExtraFeeAddress = "Withdraw Extra Feeアドレス"
    })

    beforeEach(async function () {
        const VWBLContractWalletFactory = await ethers.getContractFactory("VWBLContractWallet")
        vwblContractWallet = (await VWBLContractWalletFactory.deploy(
            [accounts[0], accounts[1]], // オーナー
            2, // 必要な承認数
            gatewayV1Address, // gatewayV1Address
            gatewayV2Address, // gatewayV2Address
            testTokenAddress, // scFeeRegistryAddress
            accounts[2], // vwblFeeSetterAddress
            accounts[3] // withdrawExtraFeeAddress
        )) as VWBLContractWallet
        await vwblContractWallet.waitForDeployment()
    })

    describe("Ownership and Access Control", function () {
        it("should allow valid owners to register a new owned contract", async function () {
            // オーナーロールがあるユーザーが新しい契約アドレスを登録
            await vwblContractWallet.registerOwnedContract(testTokenAddress)
            const ownedContracts = await vwblContractWallet.getOwnedContracts()
            expect(ownedContracts).to.include(testTokenAddress)
        })
        it("should not allow unauthorized users to register a new owned contract", async function () {
            // 権限のないユーザーが契約アドレスを登録しようとした時にエラーが発生することを確認

            await expect(
                vwblContractWallet.connect(await ethers.getSigner(accounts[5])).registerOwnedContract(testTokenAddress)
            ).to.be.revertedWith("msg sender doesn't have OPERATOR_ROLE")
        })
    })

    describe("Fee Settings", function () {
        it("should set native token fee correctly by authorized user", async function () {
            // 許可されたユーザーによるネイティブトークンの料金設定が正しく行われることを確認
            const newFee = ethers.parseUnits("1", "wei")
            await expect(vwblContractWallet.setNativeTokenFee(newFee))
                .to.emit(vwblContractWallet, "FeeUpdated")
                .withArgs(newFee)
        })
        it("should fail to set native token fee by unauthorized user", async function () {
            await expect(
                vwblContractWallet.connect(await ethers.provider.getSigner(5)).setNativeTokenFee(1000)
            ).to.be.revertedWith("msg sender doesn't have SET_FEE_ROLE")
        })
    })
})

import { expect } from "chai"
import { ethers } from "hardhat"
import { WithdrawExtraFee } from "../typechain-types"

describe("WithdrawExtraFee", function () {
    let withdrawExtraFee: WithdrawExtraFee
    let owner: any
    let addr1: any
    let addr2: any
    let addrs: any

    beforeEach(async function () {
        ;[owner, addr1, addr2, ...addrs] = await ethers.getSigners()
        const WithdrawExtraFee = await ethers.getContractFactory("WithdrawExtraFee")
        withdrawExtraFee = await WithdrawExtraFee.deploy(owner.address)
        await withdrawExtraFee.waitForDeployment()
    })
    // 追加料金を預ける
    describe("depositExtraFee", function () {
        // depositExtraFeeが正常に動作するか
        it("should deposit extra fee correctly", async function () {
            const depositAmount = ethers.parseEther("1")
            await withdrawExtraFee.depositExtraFee(addr1.address, { value: depositAmount })
            expect(await withdrawExtraFee.srcAddrToPendingExtraFee(addr1.address)).to.equal(depositAmount)
            expect(await withdrawExtraFee.totalPendingExtraFee()).to.equal(depositAmount)
        })

        // 既存の残高がある状態で追加の入金を行う
        it("should add to existing balance", async function () {
            const initialDeposit = ethers.parseEther("1")
            const additionalDeposit = ethers.parseEther("0.5")

            await withdrawExtraFee.depositExtraFee(addr1.address, { value: initialDeposit })
            await withdrawExtraFee.depositExtraFee(addr1.address, { value: additionalDeposit })

            const totalDeposit = initialDeposit + additionalDeposit
            expect(await withdrawExtraFee.srcAddrToPendingExtraFee(addr1.address)).to.equal(totalDeposit)
            expect(await withdrawExtraFee.totalPendingExtraFee()).to.equal(totalDeposit)
        })

        // 複数回の入金が正しく処理され、合計額が正確に計算されるか
        it("should handle multiple deposits correctly", async function () {
            const depositAmount = ethers.parseEther("0.1")
            let totalDeposit = 0n

            for (let i = 0; i < 5; i++) {
                await withdrawExtraFee.depositExtraFee(addr1.address, { value: depositAmount })
                totalDeposit += depositAmount
            }

            expect(await withdrawExtraFee.srcAddrToPendingExtraFee(addr1.address)).to.equal(totalDeposit)
            expect(await withdrawExtraFee.totalPendingExtraFee()).to.equal(totalDeposit)
        })

        // 異なるアドレスに対する入金が個別に正しく処理され、全体の合計も正確に計算されるか
        it("should handle deposits for different addresses", async function () {
            const deposit1 = ethers.parseEther("1")
            const deposit2 = ethers.parseEther("0.5")

            await withdrawExtraFee.depositExtraFee(addr1.address, { value: deposit1 })
            await withdrawExtraFee.depositExtraFee(addr2.address, { value: deposit2 })

            expect(await withdrawExtraFee.srcAddrToPendingExtraFee(addr1.address)).to.equal(deposit1)
            expect(await withdrawExtraFee.srcAddrToPendingExtraFee(addr2.address)).to.equal(deposit2)
            expect(await withdrawExtraFee.totalPendingExtraFee()).to.equal(deposit1 + deposit2)
        })
    })

    // 指定したソースアドレスのすべての保留中の追加料金を引き出す
    describe("withdrawAllPendingToken", function () {
        // withdrawAllPendingTokenが正常に動作するか？
        // 全ての保留中のトークンが正しく引き出されるかをテスト
        it("should withdraw all pending tokens correctly", async function () {
            // 1 Etherを入金
            const depositAmount = ethers.parseEther("1")
            await withdrawExtraFee.depositExtraFee(addr1.address, { value: depositAmount })

            // 引き出し前の残高を記録
            const initialBalance = await ethers.provider.getBalance(addr1.address)

            // すべての保留中のトークンを引き出す
            const tx = await withdrawExtraFee.connect(addr1).withdrawAllPendingToken(addr1.address)
            const receipt = await tx.wait()
            if (!receipt) {
                throw new Error("Transaction failed")
            }
            // ガス代を計算
            const gasUsed = receipt.gasUsed * tx.gasPrice

            // 引き出し後、保留中の額が0になっていることを確認
            expect(await withdrawExtraFee.srcAddrToPendingExtraFee(addr1.address)).to.equal(0n)
            expect(await withdrawExtraFee.totalPendingExtraFee()).to.equal(0n)

            // 引き出し後の残高を確認
            const finalBalance = await ethers.provider.getBalance(addr1.address)
            const balanceDiff = finalBalance - initialBalance + gasUsed
            // 引き出された額が入金額と近似していることを確認（ガス代を考慮）
            expect(balanceDiff).to.be.closeTo(depositAmount, ethers.parseEther("0.0001"))
        })

        // 未登録のアドレスからの引き出しが失敗することをテスト
        it("should fail when called by unregistered address", async function () {
            await expect(withdrawExtraFee.connect(addr2).withdrawAllPendingToken(addr2.address)).to.be.revertedWith(
                "pending extra fee amount is 0"
            )
        })

        // ソースアドレスまたは受取人アドレス以外からの引き出しが失敗することをテスト
        it("should fail when called by non-source or non-recipient address", async function () {
            // addr1に1 Etherを入金
            await withdrawExtraFee.depositExtraFee(addr1.address, { value: ethers.parseEther("1") })
            // addr2がaddr1の資金を引き出そうとして失敗することを確認
            await expect(withdrawExtraFee.connect(addr2).withdrawAllPendingToken(addr1.address)).to.be.revertedWith(
                "msg sender is invalid withdrawer"
            )
        })
    })

    // 指定したソースアドレスから特定の金額を引き出すテスト
    describe("withdrawPendingToken", function () {
        // 指定した金額を正しく引き出せるかテスト
        it("should withdraw specified amount correctly", async function () {
            const depositAmount = ethers.parseEther("1")
            const withdrawAmount = ethers.parseEther("0.5")
            // 1 Etherを入金
            await withdrawExtraFee.depositExtraFee(addr1.address, { value: depositAmount })

            // 引き出し前の残高を記録
            const initialBalance = await ethers.provider.getBalance(addr1.address)
            // 0.5 Etherを引き出す
            const tx = await withdrawExtraFee.connect(addr1).withdrawPendingToken(addr1.address, withdrawAmount)
            const receipt = await tx.wait()
            if (!receipt) {
                throw new Error("Transaction failed")
            }
            // ガス代を計算
            const gasUsed = receipt.gasUsed * tx.gasPrice

            // 残りの保留中の金額が正しいか確認
            expect(await withdrawExtraFee.srcAddrToPendingExtraFee(addr1.address)).to.equal(
                depositAmount - withdrawAmount
            )
            expect(await withdrawExtraFee.totalPendingExtraFee()).to.equal(depositAmount - withdrawAmount)

            // 引き出し後の残高を確認
            const finalBalance = await ethers.provider.getBalance(addr1.address)
            const balanceDiff = finalBalance - initialBalance + gasUsed
            // 引き出された額が指定した金額と近似していることを確認（ガス代を考慮）
            expect(balanceDiff).to.be.closeTo(withdrawAmount, ethers.parseEther("0.0001"))
        })

        // 保留中の金額以上を引き出そうとした場合に失敗することをテスト
        it("should fail when trying to withdraw more than pending amount", async function () {
            await withdrawExtraFee.depositExtraFee(addr1.address, { value: ethers.parseEther("1") })
            await expect(
                withdrawExtraFee.connect(addr1).withdrawPendingToken(addr1.address, ethers.parseEther("2"))
            ).to.be.revertedWith("withdraw amount is insufficent than pending amount")
        })

        // 0の金額を引き出そうとした場合に失敗することをテスト
        it("should fail when trying to withdraw zero amount", async function () {
            await withdrawExtraFee.depositExtraFee(addr1.address, { value: ethers.parseEther("1") })
            await expect(withdrawExtraFee.connect(addr1).withdrawPendingToken(addr1.address, 0n)).to.be.revertedWith(
                "withdraw amount is insufficent than pending amount"
            )
        })
    })

    // オーナーのみが呼び出すことができる関数
    // 特定のソースアドレスに対して受取人アドレスを設定するテスト
    describe("setRecipient", function () {
        // 受取人アドレスが正しく設定されるかテスト
        it("should set recipient correctly", async function () {
            await withdrawExtraFee.connect(owner).setRecipient(addr1.address, addr2.address)
            expect(await withdrawExtraFee.srcAddrToRecipient(addr1.address)).to.equal(addr2.address)
        })

        // オーナー以外が受取人アドレスを設定しようとした場合に失敗することをテスト
        it("should fail when non-owner tries to set recipient", async function () {
            await expect(withdrawExtraFee.connect(addr1).setRecipient(addr1.address, addr2.address))
                .to.be.revertedWithCustomError(withdrawExtraFee, "OwnableUnauthorizedAccount")
                .withArgs(addr1.address)
        })
    })
})

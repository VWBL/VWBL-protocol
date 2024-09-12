import { expect } from "chai"
import { ethers } from "hardhat"
import { WithdrawExtraFee } from "../typechain-types"

describe("WithdrawExtraFee", function () {
    let WithdrawExtraFeeFactory: any
    let owner: any
    let addr1: any
    let addr2: any
    let addrs: any[]
    let withdrawExtraFee: WithdrawExtraFee

    before(async function () {
        [owner, addr1, addr2, ...addrs] = await ethers.getSigners()

        WithdrawExtraFeeFactory = await ethers.getContractFactory("WithdrawExtraFee")
    })

    beforeEach(async function () {
        withdrawExtraFee = await WithdrawExtraFeeFactory.deploy(owner.address)
        await withdrawExtraFee.waitForDeployment()
    })

    describe("depositExtraFee", function () {
        it("should deposit extra fee correctly", async function () {
            const depositAmount = ethers.parseEther("1")
            await withdrawExtraFee.depositExtraFee(addr1.address, { value: depositAmount })
            expect(await withdrawExtraFee.srcAddrToPendingExtraFee(addr1.address)).to.equal(depositAmount)
            expect(await withdrawExtraFee.totalPendingExtraFee()).to.equal(depositAmount)
        })

        it("should add to existing balance", async function () {
            const initialDeposit = ethers.parseEther("1")
            const additionalDeposit = ethers.parseEther("0.5")

            await withdrawExtraFee.depositExtraFee(addr1.address, { value: initialDeposit })
            await withdrawExtraFee.depositExtraFee(addr1.address, { value: additionalDeposit })

            const totalDeposit = initialDeposit + additionalDeposit
            expect(await withdrawExtraFee.srcAddrToPendingExtraFee(addr1.address)).to.equal(totalDeposit)
            expect(await withdrawExtraFee.totalPendingExtraFee()).to.equal(totalDeposit)
        })

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

    describe("withdrawAllPendingToken", function () {
        it("should fail when called by unregistered address", async function () {
            await expect(withdrawExtraFee.connect(addr2).withdrawAllPendingToken(addr2.address)).to.be.revertedWith(
                "pending extra fee amount is 0"
            )
        })

        it("should fail when called by non-source or non-recipient address", async function () {
            await withdrawExtraFee.depositExtraFee(addr1.address, { value: ethers.parseEther("1") })
            await expect(withdrawExtraFee.connect(addr2).withdrawAllPendingToken(addr1.address)).to.be.revertedWith(
                "msg sender is invalid withdrawer"
            )
        })
        it("should withdraw all pending tokens correctly", async function () {
            const depositAmount = ethers.parseEther("1")
            await withdrawExtraFee.depositExtraFee(addr1.address, { value: depositAmount })

            const initialBalance = await ethers.provider.getBalance(addr1.address)

            const tx = await withdrawExtraFee.connect(addr1).withdrawAllPendingToken(addr1.address)
            const receipt = await tx.wait()
            if (!receipt) {
                throw new Error("Transaction failed")
            }
            const gasUsed = receipt.gasUsed * tx.gasPrice

            expect(await withdrawExtraFee.srcAddrToPendingExtraFee(addr1.address)).to.equal(0n)
            expect(await withdrawExtraFee.totalPendingExtraFee()).to.equal(0n)

            const finalBalance = await ethers.provider.getBalance(addr1.address)
            const balanceDiff = finalBalance - initialBalance + gasUsed
            expect(balanceDiff).to.be.closeTo(depositAmount, ethers.parseEther("0.0001"))
        })
    })

    describe("withdrawPendingToken", function () {
        it("should fail when trying to withdraw more than pending amount", async function () {
            await withdrawExtraFee.depositExtraFee(addr1.address, { value: ethers.parseEther("1") })
            await expect(
                withdrawExtraFee.connect(addr1).withdrawPendingToken(addr1.address, ethers.parseEther("2"))
            ).to.be.revertedWith("withdraw amount is insufficent than pending amount")
        })
        it("should withdraw specified amount correctly", async function () {
            const depositAmount = ethers.parseEther("1")
            const withdrawAmount = ethers.parseEther("0.5")
            await withdrawExtraFee.depositExtraFee(addr1.address, { value: depositAmount })

            const initialBalance = await ethers.provider.getBalance(addr1.address)
            const tx = await withdrawExtraFee.connect(addr1).withdrawPendingToken(addr1.address, withdrawAmount)
            const receipt = await tx.wait()
            if (!receipt) {
                throw new Error("Transaction failed")
            }
            const gasUsed = receipt.gasUsed * tx.gasPrice

            expect(await withdrawExtraFee.srcAddrToPendingExtraFee(addr1.address)).to.equal(
                depositAmount - withdrawAmount
            )
            expect(await withdrawExtraFee.totalPendingExtraFee()).to.equal(depositAmount - withdrawAmount)

            const finalBalance = await ethers.provider.getBalance(addr1.address)
            const balanceDiff = finalBalance - initialBalance + gasUsed
            expect(balanceDiff).to.be.closeTo(withdrawAmount, ethers.parseEther("0.0001"))
        })
    })

    describe("setRecipient", function () {
        it("should fail when non-owner tries to set recipient", async function () {
            await expect(withdrawExtraFee.connect(addr1).setRecipient(addr1.address, addr2.address))
                .to.be.revertedWithCustomError(withdrawExtraFee, "OwnableUnauthorizedAccount")
                .withArgs(addr1.address)
        })
        it("should set recipient correctly", async function () {
            await withdrawExtraFee.connect(owner).setRecipient(addr1.address, addr2.address)
            expect(await withdrawExtraFee.srcAddrToRecipient(addr1.address)).to.equal(addr2.address)
        })
        it("should allow withdrawal by set recipient", async function () {
            const depositAmount = ethers.parseEther("1")
            await withdrawExtraFee.depositExtraFee(addr1.address, { value: depositAmount })
            await withdrawExtraFee.connect(owner).setRecipient(addr1.address, addr2.address)

            const initialBalance = await ethers.provider.getBalance(addr2.address)
            const tx = await withdrawExtraFee.connect(addr2).withdrawAllPendingToken(addr1.address)
            const receipt = await tx.wait()
            if (!receipt) {
                throw new Error("Transaction failed to complete.")
            }
            const gasUsed = receipt.gasUsed * tx.gasPrice

            expect(await withdrawExtraFee.srcAddrToPendingExtraFee(addr1.address)).to.equal(0n)
            expect(await withdrawExtraFee.totalPendingExtraFee()).to.equal(0n)

            const finalBalance = await ethers.provider.getBalance(addr2.address)
            const balanceDiff = finalBalance - initialBalance + gasUsed
            expect(balanceDiff).to.be.closeTo(depositAmount, ethers.parseEther("0.0001"))
        })
    })
})

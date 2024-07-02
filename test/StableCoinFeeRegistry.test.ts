import { expect, assert } from "chai"
import hre, { ethers } from "hardhat"
import { deployContracts, DeploymentInfo, fee, ONE_GWEI } from "./lib/common"

describe("StableCoinFeeRegistry", async () => {
    let stableCoinFeeRegistry: any
    let owner: any

    // Polygon Mainnet上のERC20アドレス
    const DAI_ADDRESS = "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063"
    const USDC_ADDRESS = "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359"
    const USDT_ADDRESS = "0xc2132D05D31c914a87C6611C10748AEb04B58e8F"
    const BUSD_ADDRESS = "0x9C9e5fD8bbc25984B178FdCE6117Defa39d2db39"

    beforeEach(async function () {
        // コントラクトのデプロイ
        ;[owner] = await ethers.getSigners()
        const StableCoinFeeRegistry = await ethers.getContractFactory("StableCoinFeeRegistry")
        stableCoinFeeRegistry = await StableCoinFeeRegistry.deploy(owner.address)
        await stableCoinFeeRegistry.waitForDeployment()
        await stableCoinFeeRegistry.connect(owner).reset()
        console.log("After reset:")
        for (const address of [DAI_ADDRESS, USDC_ADDRESS, USDT_ADDRESS]) {
            const isRegistered = await stableCoinFeeRegistry.registered(address)
            const fiatIndex = await stableCoinFeeRegistry.erc20ToFiatIndex(address)
            console.log(`Address ${address} registered: ${isRegistered}, fiat index: ${fiatIndex}`)
        }
    })
    it("should register multiple fiat currencies correctly", async function () {
        console.log("Before any registration:")
        for (const address of [DAI_ADDRESS, USDC_ADDRESS, USDT_ADDRESS]) {
            const isRegistered = await stableCoinFeeRegistry.registered(address)
            const fiatIndex = await stableCoinFeeRegistry.erc20ToFiatIndex(address)
            console.log(`Address ${address} registered: ${isRegistered}, fiat index: ${fiatIndex}`)
        }
        const fiatName1 = "usd"
        const erc20Addresses1 = [DAI_ADDRESS, USDC_ADDRESS]
        const feeNumerator1 = 1 * 100000

        await stableCoinFeeRegistry.registerStableCoinInfo(fiatName1, erc20Addresses1, feeNumerator1)

        const fiatName2 = "eur"
        const erc20Addresses2 = [USDT_ADDRESS]
        const feeNumerator2 = 2 * 100000

        await stableCoinFeeRegistry.registerStableCoinInfo(fiatName2, erc20Addresses2, feeNumerator2)

        // Check fiat indices
        expect(await stableCoinFeeRegistry.erc20ToFiatIndex(DAI_ADDRESS)).to.equal(1)
        expect(await stableCoinFeeRegistry.erc20ToFiatIndex(USDC_ADDRESS)).to.equal(1)
        expect(await stableCoinFeeRegistry.erc20ToFiatIndex(USDT_ADDRESS)).to.equal(2)

        // Check nextFiatIndex
        expect(await stableCoinFeeRegistry.nextFiatIndex()).to.equal(3)
    })
    // registerStableCoinInfo methodが正常に動作するか
    it("should register stable coin info correctly", async function () {
        const fiatName = "usd"
        const erc20Addresses = [DAI_ADDRESS, USDC_ADDRESS, USDT_ADDRESS]
        const feeNumerator = 1 * 100000
        await stableCoinFeeRegistry.registerStableCoinInfo(fiatName, erc20Addresses, feeNumerator)
        console.log("Before registration:")
        for (const address of erc20Addresses) {
            const isRegistered = await stableCoinFeeRegistry.registered(address)
            console.log(`Address ${address} registered: ${isRegistered}`)
        }
        for (const address of erc20Addresses) {
            const fiatIndex = await stableCoinFeeRegistry.getErc20ToFiatIndex(address)
            console.log(`Address ${address} fiat index: ${fiatIndex}`)
        }
        // Check getFeeDecimals
        const [feeDecimals, isRegistered] = await stableCoinFeeRegistry.getFeeDecimals(USDC_ADDRESS)
        expect(isRegistered).to.be.true
        expect(feeDecimals).to.equal(ethers.parseUnits("0.1", 6))
        // Check getRegisteredTokens
        const registeredTokens = await stableCoinFeeRegistry.getRegisteredTokens()
        expect(registeredTokens).to.deep.equal(erc20Addresses)
        // Check getRegisteredTokensCount
        const tokenCount = await stableCoinFeeRegistry.getRegisteredTokensCount()
        expect(tokenCount).to.equal(3)
    })

    // registerStableCoinInfo methodを登録ずみのトークンで呼び出した場合にエラー
    it("should revert when registering already registered ERC20", async function () {
        await stableCoinFeeRegistry.registerStableCoinInfo("usd", [DAI_ADDRESS], 1000)
        await expect(stableCoinFeeRegistry.registerStableCoinInfo("usd", [DAI_ADDRESS], 1000)).to.be.revertedWith(
            "ERC20 is already registered"
        )
    })
    // registerERC20Addressesを正しくないfiatIndexで呼び出した場合にエラー
    it("should revert when called with invalid fiatIndex", async function () {
        await expect(stableCoinFeeRegistry.registerERC20Addresses(999, [BUSD_ADDRESS])).to.be.revertedWith(
            "fiatIndex is invalid"
        )
    })
    // registerERC20Addressesを録ずみのトークンで呼び出した場合にエラー
    it("should revert when registering already registered ERC20", async function () {
        await stableCoinFeeRegistry.registerStableCoinInfo("usd", [DAI_ADDRESS], 1000)
        await expect(stableCoinFeeRegistry.registerERC20Addresses(1, [DAI_ADDRESS])).to.be.revertedWith(
            "This ERC20 is already registered"
        )
    })
    //registerERC20Addressesが正常に動作するか？
    it("should register new ERC20 addresses correctly", async function () {
        await stableCoinFeeRegistry.registerStableCoinInfo("usd", [DAI_ADDRESS, USDC_ADDRESS], 1000)
        await stableCoinFeeRegistry.registerERC20Addresses(1, [BUSD_ADDRESS])

        expect(await stableCoinFeeRegistry.registered(BUSD_ADDRESS)).to.be.true

        const [feeDecimals, isRegistered] = await stableCoinFeeRegistry.getFeeDecimals(BUSD_ADDRESS)
        expect(isRegistered).to.be.true
        expect(feeDecimals).to.equal(ethers.parseUnits("0.1", 18)) // BUSD has 18 decimals

        const registeredTokens = await stableCoinFeeRegistry.getRegisteredTokens()
        expect(registeredTokens).to.deep.equal([DAI_ADDRESS, USDC_ADDRESS, BUSD_ADDRESS])

        const tokenCount = await stableCoinFeeRegistry.getRegisteredTokensCount()
        expect(tokenCount).to.equal(3)
    })
    // unregisterERC20Addressを正しくないfiatIndexで呼び出した場合にエラー
    it("should revert when called with invalid fiatIndex", async function () {
        await expect(stableCoinFeeRegistry.unregisterERC20Address(999, USDT_ADDRESS)).to.be.revertedWith(
            "fiatIndex is invalid"
        )
    })
    // unregisterERC20Addressを登録されていないトークンで呼び出した場合にエラー
    it("should revert when unregistering an unregistered ERC20", async function () {
        await stableCoinFeeRegistry.registerStableCoinInfo("usd", [DAI_ADDRESS], 1000)
        await expect(stableCoinFeeRegistry.unregisterERC20Address(1, USDT_ADDRESS)).to.be.revertedWith(
            "This ERC20 is not registered"
        )
    })
    // unregisterERC20Addressが正常に動作するか
    it("should unregister ERC20 addresses correctly", async function () {
        await stableCoinFeeRegistry.registerStableCoinInfo(
            "usd",
            [DAI_ADDRESS, USDC_ADDRESS, USDT_ADDRESS, BUSD_ADDRESS],
            1000
        )
        await stableCoinFeeRegistry.unregisterERC20Address(1, USDT_ADDRESS)
        await stableCoinFeeRegistry.unregisterERC20Address(1, BUSD_ADDRESS)

        expect(await stableCoinFeeRegistry.registered(USDT_ADDRESS)).to.be.false
        expect(await stableCoinFeeRegistry.registered(BUSD_ADDRESS)).to.be.false

        const registeredTokens = await stableCoinFeeRegistry.getRegisteredTokens()
        expect(registeredTokens).to.deep.equal([DAI_ADDRESS, USDC_ADDRESS])

        const tokenCount = await stableCoinFeeRegistry.getRegisteredTokensCount()
        expect(tokenCount).to.equal(2)
    })
    // registerFeeNumeratorを正しくないfiatIndexで呼び出した場合にエラー
    it("should revert when called with invalid fiatIndex", async function () {
        await expect(stableCoinFeeRegistry.registerFeeNumerator(999, 500)).to.be.revertedWith("fiatIndex is invalid")
    })
    // registerFeeNumeratorが正常に動作するか
    it("should register new fee numerator correctly", async function () {
        await stableCoinFeeRegistry.registerStableCoinInfo("usd", [USDC_ADDRESS], 1000) // 0.1%
        await stableCoinFeeRegistry.registerFeeNumerator(1, 500) // 0.05%

        const [feeDecimals, isRegistered] = await stableCoinFeeRegistry.getFeeDecimals(USDC_ADDRESS)
        expect(isRegistered).to.be.true
        expect(feeDecimals).to.equal(ethers.parseUnits("0.05", 6))
    })
})

import { expect } from "chai"
import { ethers } from "hardhat"
interface TokenInfo {
    address: string
    decimals: number
}

interface TokenDictionary {
    [key: string]: TokenInfo
}
describe("StableCoinFeeRegistry", async () => {
    let stableCoinFeeRegistry: any
    let owner: any

    const tokens: TokenDictionary = {
        DAI: { address: "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063", decimals: 18 },
        USDC: { address: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359", decimals: 6 },
        USDT: { address: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F", decimals: 6 },
        BUSD: { address: "0x9C9e5fD8bbc25984B178FdCE6117Defa39d2db39", decimals: 18 },
    }

    beforeEach(async function () {
        ;[owner] = await ethers.getSigners()
        const StableCoinFeeRegistry = await ethers.getContractFactory("StableCoinFeeRegistry")
        stableCoinFeeRegistry = await StableCoinFeeRegistry.deploy(owner.address)
        await stableCoinFeeRegistry.waitForDeployment()
        await stableCoinFeeRegistry.connect(owner).reset()
    })
    // registerStableCoinInfo methodが正常に動作するか
    it("should register stable coin info correctly", async function () {
        const fiatName = "usd"
        const erc20Addresses = [tokens.DAI.address, tokens.USDC.address, tokens.USDT.address]
        const decimalses = [tokens.DAI.decimals, tokens.USDC.decimals, tokens.USDT.decimals]
        const feeNumerator = 1 // 0.01% (1 / 10000)
        await stableCoinFeeRegistry.registerStableCoinInfo(fiatName, erc20Addresses, decimalses, feeNumerator)

        // Check getFeeDecimals
        const [daiFeeDec, isRegisteredDAI] = await stableCoinFeeRegistry.getFeeDecimals(tokens.DAI.address)
        expect(isRegisteredDAI).to.be.true
        expect(daiFeeDec).to.equal(ethers.parseUnits("0.0001", 18)) // 0.01% for DAI (18 decimals)

        const [usdcFeeDec, isRegisteredUSDC] = await stableCoinFeeRegistry.getFeeDecimals(tokens.USDC.address)
        expect(isRegisteredUSDC).to.be.true
        expect(usdcFeeDec).to.equal(ethers.parseUnits("0.0001", 6)) // 0.01% for USDC (6 decimals)

        const [usdtFeeDec, isRegisteredUSDT] = await stableCoinFeeRegistry.getFeeDecimals(tokens.USDT.address)
        expect(isRegisteredUSDT).to.be.true
        expect(usdtFeeDec).to.equal(ethers.parseUnits("0.0001", 6)) // 0.01% for USDT (6 decimals)

        // Check getRegisteredTokens
        const registeredTokens = await stableCoinFeeRegistry.getRegisteredTokens()
        expect(registeredTokens).to.deep.equal(erc20Addresses)

        // Check getRegisteredTokensCount
        const tokenCount = await stableCoinFeeRegistry.getRegisteredTokensCount()
        expect(tokenCount).to.equal(3)
    })

    // registerStableCoinInfo methodを登録ずみのトークンで呼び出した場合にエラー
    it("should revert when registering already registered ERC20", async function () {
        await stableCoinFeeRegistry.registerStableCoinInfo("usd", [tokens.DAI.address], [tokens.DAI.decimals], 1000)
        await expect(
            stableCoinFeeRegistry.registerStableCoinInfo("usd", [tokens.DAI.address], [tokens.DAI.decimals], 1000)
        ).to.be.revertedWith("ERC20 is already registered")
    })
    // registerERC20Addressesを正しくないfiatIndexで呼び出した場合にエラー
    it("should revert when called with invalid fiatIndex", async function () {
        await expect(
            stableCoinFeeRegistry.registerERC20Addresses(999, [tokens.BUSD.address], [tokens.BUSD.decimals])
        ).to.be.revertedWith("fiatIndex is invalid")
    })
    // registerERC20Addressesを録ずみのトークンで呼び出した場合にエラー
    it("should revert when registering already registered ERC20", async function () {
        await stableCoinFeeRegistry.registerStableCoinInfo("usd", [tokens.DAI.address], [tokens.DAI.decimals], 1000)
        await expect(
            stableCoinFeeRegistry.registerERC20Addresses(1, [tokens.DAI.address], [tokens.DAI.decimals])
        ).to.be.revertedWith("This ERC20 is already registered")
    })
    //registerERC20Addressesが正常に動作するか？
    it("should register new ERC20 addresses correctly", async function () {
        await stableCoinFeeRegistry.registerStableCoinInfo(
            "usd",
            [tokens.DAI.address, tokens.USDC.address],
            [tokens.DAI.decimals, tokens.USDC.decimals],
            1000
        )
        await stableCoinFeeRegistry.registerERC20Addresses(1, [tokens.BUSD.address], [tokens.BUSD.decimals])

        expect(await stableCoinFeeRegistry.registered(tokens.BUSD.address)).to.be.true

        const [feeDecimals, isRegistered] = await stableCoinFeeRegistry.getFeeDecimals(tokens.BUSD.address)
        expect(isRegistered).to.be.true
        expect(feeDecimals).to.equal(ethers.parseUnits("0.1", 18))

        const registeredTokens = await stableCoinFeeRegistry.getRegisteredTokens()
        expect(registeredTokens).to.deep.equal([tokens.DAI.address, tokens.USDC.address, tokens.BUSD.address])

        const tokenCount = await stableCoinFeeRegistry.getRegisteredTokensCount()
        expect(tokenCount).to.equal(3)
    })
    // unregisterERC20Addressを正しくないfiatIndexで呼び出した場合にエラー
    it("should revert when called with invalid fiatIndex", async function () {
        await expect(stableCoinFeeRegistry.unregisterERC20Address(999, tokens.USDT.address)).to.be.revertedWith(
            "fiatIndex is invalid"
        )
    })
    // unregisterERC20Addressを登録されていないトークンで呼び出した場合にエラー
    it("should revert when unregistering an unregistered ERC20", async function () {
        await stableCoinFeeRegistry.registerStableCoinInfo("usd", [tokens.DAI.address], [tokens.DAI.decimals], 1000)
        await expect(stableCoinFeeRegistry.unregisterERC20Address(1, tokens.USDT.address)).to.be.revertedWith(
            "This ERC20 is not registered"
        )
    })
    // unregisterERC20Addressが正常に動作するか
    it("should unregister ERC20 addresses correctly", async function () {
        await stableCoinFeeRegistry.registerStableCoinInfo(
            "usd",
            [tokens.DAI.address, tokens.USDC.address, tokens.USDT.address, tokens.BUSD.address],
            [tokens.DAI.decimals, tokens.USDC.decimals, tokens.USDT.decimals, tokens.BUSD.decimals],
            1000
        )
        await stableCoinFeeRegistry.unregisterERC20Address(1, tokens.USDT.address)
        await stableCoinFeeRegistry.unregisterERC20Address(1, tokens.BUSD.address)

        expect(await stableCoinFeeRegistry.registered(tokens.USDT.address)).to.be.false
        expect(await stableCoinFeeRegistry.registered(tokens.BUSD.address)).to.be.false

        const registeredTokens = await stableCoinFeeRegistry.getRegisteredTokens()
        expect(registeredTokens).to.deep.equal([tokens.DAI.address, tokens.USDC.address])

        const tokenCount = await stableCoinFeeRegistry.getRegisteredTokensCount()
        expect(tokenCount).to.equal(2)
    })
    // registerFeeNumeratorを正しくないfiatIndexで呼び出した場合にエラー
    it("should revert when called with invalid fiatIndex", async function () {
        await expect(stableCoinFeeRegistry.registerFeeNumerator(999, 500)).to.be.revertedWith("fiatIndex is invalid")
    })
    // registerFeeNumeratorが正常に動作するか
    it("should register new fee numerator correctly", async function () {
        await stableCoinFeeRegistry.registerStableCoinInfo("usd", [tokens.USDC.address], [tokens.USDC.decimals], 1000)
        await stableCoinFeeRegistry.registerFeeNumerator(1, 500) // 0.05%

        const [feeDecimals, isRegistered] = await stableCoinFeeRegistry.getFeeDecimals(tokens.USDC.address)
        expect(isRegistered).to.be.true
        expect(feeDecimals).to.equal(ethers.parseUnits("0.05", 6))
    })
})

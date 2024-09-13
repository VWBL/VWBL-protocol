import { expect } from "chai"
import hre, { ethers } from "hardhat"
import { IStableCoinFeeRegistry } from "../typechain-types"

interface TokenInfo {
    address: string
    decimals: number
}

interface TokenDictionary {
    [key: string]: TokenInfo
}

describe("StableCoinFeeRegistry", () => {
    let stableCoinFeeRegistry: IStableCoinFeeRegistry
    let owner: any
    let accounts: any

    const tokens: TokenDictionary = {
        DAI: { address: "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063", decimals: 18 },
        USDC: { address: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359", decimals: 6 },
        USDT: { address: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F", decimals: 6 },
        BUSD: { address: "0x9C9e5fD8bbc25984B178FdCE6117Defa39d2db39", decimals: 18 },
    }

    before(async () => {
        accounts = await hre.ethers.getSigners()
        owner = accounts[0]

        const StableCoinFeeRegistry = await ethers.getContractFactory("StableCoinFeeRegistry")
        stableCoinFeeRegistry = await StableCoinFeeRegistry.deploy(owner.address)
        await stableCoinFeeRegistry.waitForDeployment()
    })

    it("should register stable coin info correctly", async function () {
        const fiatName = "usd"
        const erc20Addresses = [tokens.DAI.address, tokens.USDC.address, tokens.USDT.address]
        const decimalses = [tokens.DAI.decimals, tokens.USDC.decimals, tokens.USDT.decimals]
        const feeNumerator = 0.1 * 10000
        await stableCoinFeeRegistry.registerStableCoinInfo(fiatName, erc20Addresses, decimalses, feeNumerator)

        // Check getFeeDecimals
        const [usdcFeeDec, isRegisteredUSDC] = await stableCoinFeeRegistry.getFeeDecimals(tokens.USDC.address)
        expect(isRegisteredUSDC).to.be.true
        expect(usdcFeeDec).to.equal(ethers.parseUnits("0.1", 6)) // 0.1 for USDC (6 decimals)

        const [daiFeeDec, isRegisteredDAI] = await stableCoinFeeRegistry.getFeeDecimals(tokens.DAI.address);
        expect(isRegisteredDAI).to.be.true
        expect(daiFeeDec).to.equal(ethers.parseUnits("0.1", 18));

        // Check getRegisteredTokens
        const registeredTokens = await stableCoinFeeRegistry.getRegisteredTokens()
        expect(registeredTokens).to.deep.equal(erc20Addresses)

        // Check getRegisteredTokensCount
        const tokenCount = await stableCoinFeeRegistry.getRegisteredTokensCount()
        expect(tokenCount).to.equal(3)
    })

    it("should revert when registering already registered ERC20", async function () {
        await expect(
            stableCoinFeeRegistry.registerStableCoinInfo("usd", [tokens.DAI.address], [tokens.DAI.decimals], 1000)
        ).to.be.revertedWith("ERC20 is already registered")
    })

    it("should revert when called with invalid fiatIndex", async function () {
        await expect(
            stableCoinFeeRegistry.registerERC20Addresses(999, [tokens.BUSD.address], [tokens.BUSD.decimals])
        ).to.be.revertedWith("fiatIndex is invalid")
    })

    it("should register new ERC20 addresses correctly", async function () {
        await stableCoinFeeRegistry.registerERC20Addresses(1, [tokens.BUSD.address], [tokens.BUSD.decimals])

        expect(await stableCoinFeeRegistry.registered(tokens.BUSD.address)).to.be.true

        const [feeDecimals, isRegistered] = await stableCoinFeeRegistry.getFeeDecimals(tokens.BUSD.address)
        expect(isRegistered).to.be.true
        expect(feeDecimals).to.equal(ethers.parseUnits("0.1", 18))

        const registeredTokens = await stableCoinFeeRegistry.getRegisteredTokens()
        expect(registeredTokens).to.deep.equal([
            tokens.DAI.address,
            tokens.USDC.address,
            tokens.USDT.address,
            tokens.BUSD.address,
        ])

        const tokenCount = await stableCoinFeeRegistry.getRegisteredTokensCount()
        expect(tokenCount).to.equal(4)
    })
    it("should revert when called with invalid fiatIndex", async function () {
        await expect(stableCoinFeeRegistry.unregisterERC20Address(999, tokens.USDT.address)).to.be.revertedWith(
            "fiatIndex is invalid"
        )
    })

    it("should revert when unregistering an unregistered ERC20", async function () {
        const unregisteredToken = "0x1234567890123456789012345678901234567890"
        await expect(stableCoinFeeRegistry.unregisterERC20Address(1, unregisteredToken)).to.be.revertedWith(
            "This ERC20 is not registered"
        )
    })

    it("should unregister ERC20 addresses correctly", async function () {
        await stableCoinFeeRegistry.unregisterERC20Address(1, tokens.USDT.address)
        await stableCoinFeeRegistry.unregisterERC20Address(1, tokens.BUSD.address)

        expect(await stableCoinFeeRegistry.registered(tokens.USDT.address)).to.be.false
        expect(await stableCoinFeeRegistry.registered(tokens.BUSD.address)).to.be.false

        const registeredTokens = await stableCoinFeeRegistry.getRegisteredTokens()
        expect(registeredTokens).to.deep.equal([tokens.DAI.address, tokens.USDC.address])

        const tokenCount = await stableCoinFeeRegistry.getRegisteredTokensCount()
        expect(tokenCount).to.equal(2)
    })
    it("should revert when called with invalid fiatIndex", async function () {
        await expect(stableCoinFeeRegistry.registerFeeNumerator(999, 500)).to.be.revertedWith("fiatIndex is invalid")
    })
    it("should register new fee numerator correctly", async function () {
        await stableCoinFeeRegistry.registerFeeNumerator(1, 500) // 0.05

        const [feeDecimals, isRegistered] = await stableCoinFeeRegistry.getFeeDecimals(tokens.USDC.address)
        expect(isRegistered).to.be.true
        expect(feeDecimals).to.equal(ethers.parseUnits("0.05", 6))
    })
})

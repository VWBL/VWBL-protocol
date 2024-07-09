import { ethers } from "hardhat"
import { ZeroAddress } from "ethers"

export const ZERO_ADDRESS = ZeroAddress
export const ONE_GWEI = 1_000_000_000
export const fee = ONE_GWEI

export async function deployContractsGatewayV2() {
    console.log("Starting deployContracts")
    try {
        const accounts = await ethers.getSigners()
        const testTokenAddress = ZERO_ADDRESS

        // StableCoinFeeRegistryのデプロイ
        const StableCoinFeeRegistryFactory = await ethers.getContractFactory("StableCoinFeeRegistry")
        const stableCoinFeeRegistry = await StableCoinFeeRegistryFactory.deploy(accounts[0].address)
        await stableCoinFeeRegistry.waitForDeployment()
        console.log("StableCoinFeeRegistry deployed to:", await stableCoinFeeRegistry.getAddress())
        console.log("StableCoinFeeRegistry Owner:", await stableCoinFeeRegistry.owner())

        // WithdrawExtraFeeコントラクトをデプロイ
        const WithdrawExtraFeeFactory = await ethers.getContractFactory("WithdrawExtraFee")
        const withdrawExtraFeeRegistry = await WithdrawExtraFeeFactory.deploy(accounts[0].address)
        await withdrawExtraFeeRegistry.waitForDeployment()
        console.log("WithdrawExtraFee deployed to:", await withdrawExtraFeeRegistry.getAddress())
        console.log("WithdrawExtraFee Owner:", await withdrawExtraFeeRegistry.owner())

        // VWBLGatewayV1
        const vwblGatewayV1Factory = await ethers.getContractFactory("VWBLGateway")
        const vwblGatewayV1Registry = await vwblGatewayV1Factory.connect(accounts[0]).deploy(fee)
        await vwblGatewayV1Registry.waitForDeployment()
        const vwblGatewayV1Address = await vwblGatewayV1Registry.getAddress()
        console.log("VWBLGateway deployed to:", vwblGatewayV1Address)
        console.log("vwblGatewayV1RegistryOwner:", await vwblGatewayV1Registry.owner())

        // GatewayProxy
        const GatewayProxy = await ethers.getContractFactory("GatewayProxy")
        const GatewayProxyRegistry = await GatewayProxy.deploy(vwblGatewayV1Address)
        await GatewayProxyRegistry.waitForDeployment()
        console.log("GatewayProxy deployed to:", await GatewayProxyRegistry.getAddress())
        console.log("GatewayProxy Owner:", await GatewayProxyRegistry.owner())

        // VWBLGatewayV2のデプロイ
        const VWBLGatewayV2Factory = await ethers.getContractFactory("VWBLGatewayV2")
        const vwblGatewayV2Registry = await VWBLGatewayV2Factory.deploy(
            accounts[0].address,
            vwblGatewayV1Address,
            await stableCoinFeeRegistry.getAddress(),
            await withdrawExtraFeeRegistry.getAddress()
        )
        await vwblGatewayV2Registry.waitForDeployment()
        const vwblGatewayV2Address = await vwblGatewayV2Registry.getAddress()
        console.log("VWBLGatewayV2 deployed to:", vwblGatewayV2Address)
        console.log("VWBLGatewayV2 Owner:", await vwblGatewayV2Registry.owner())

        // VWBLContractWalletのデプロイ
        const VWBLContractWalletFactory = await ethers.getContractFactory("VWBLContractWallet")
        const vwblContractWallet = await VWBLContractWalletFactory.deploy(
            [accounts[0].address, accounts[1].address, accounts[2].address],
            2,
            vwblGatewayV1Address,
            vwblGatewayV2Address,
            await stableCoinFeeRegistry.getAddress(),
            accounts[2].address,
            await withdrawExtraFeeRegistry.getAddress()
        )
        await vwblContractWallet.waitForDeployment()
        console.log("VWBLContractWallet deployed to:", await vwblContractWallet.getAddress())

        const OPERATOR_ROLE = await vwblContractWallet.OPERATOR_ROLE()
        const isOperator = await vwblContractWallet.hasRole(OPERATOR_ROLE, accounts[0].address)
        console.log("Is accounts[0] an operator?", isOperator)

        console.log("Roles granted successfully")
        return {
            stableCoinFeeRegistry,
            withdrawExtraFeeRegistry,
            vwblGatewayV1Registry,
            vwblGatewayV2Registry,
            GatewayProxyRegistry,
            vwblContractWallet,
            accounts,
            testTokenAddress,
        }
    } catch (error) {
        console.error("Error in deployContracts:", error)
        throw error
    }
}

import { ethers } from "hardhat"
import { ZeroAddress } from "ethers"
import {
    AccessControlCheckerByERC1155,
    GatewayProxy,
    VWBLERC1155ERC2981,
    VWBLGateway,
    VWBLERC1155ERC2981ForMetadata,
    StableCoinFeeRegistry,
    WithdrawExtraFee,
    VWBLGatewayV2,
    VWBLContractWallet,
} from "../../typechain-types"
export const ZERO_ADDRESS = ZeroAddress
export const ONE_GWEI = 1_000_000_000
export const fee = ONE_GWEI
export interface DeploymentInfo {
    stableCoinFeeRegistry: StableCoinFeeRegistry
    withdrawExtraFeeRegistry: WithdrawExtraFee
    vwblGatewayV1Registry: VWBLGateway
    vwblGatewayV2Registry: VWBLGatewayV2
    GatewayProxyRegistry: GatewayProxy
    vwblContractWallet: VWBLContractWallet
    accounts: any[]
    testTokenAddress: any
}

export async function deployContractsGatewayV2(): Promise<DeploymentInfo> {
    console.log("Starting deployContracts")
    try {
        const accounts = await ethers.getSigners()
        const testTokenAddress = ZERO_ADDRESS

        // StableCoinFeeRegistryのデプロイ
        const StableCoinFeeRegistryFactory = await ethers.getContractFactory("StableCoinFeeRegistry")
        const stableCoinFeeRegistry = await StableCoinFeeRegistryFactory.deploy(accounts[0].address)
        await stableCoinFeeRegistry.waitForDeployment()

        // WithdrawExtraFeeコントラクトをデプロイ
        const WithdrawExtraFeeFactory = await ethers.getContractFactory("WithdrawExtraFee")
        const withdrawExtraFeeRegistry = await WithdrawExtraFeeFactory.deploy(accounts[0].address)
        await withdrawExtraFeeRegistry.waitForDeployment()

        // VWBLGatewayV1
        const vwblGatewayV1Factory = await ethers.getContractFactory("VWBLGateway")
        const vwblGatewayV1Registry = await vwblGatewayV1Factory.connect(accounts[0]).deploy(fee)
        await vwblGatewayV1Registry.waitForDeployment()
        const vwblGatewayV1Address = await vwblGatewayV1Registry.getAddress()

        // GatewayProxy
        const GatewayProxy = await ethers.getContractFactory("GatewayProxy")
        const GatewayProxyRegistry = await GatewayProxy.deploy(vwblGatewayV1Address)
        await GatewayProxyRegistry.waitForDeployment()

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

        const VWBLContractWalletFactory = await ethers.getContractFactory("VWBLContractWallet")
        const vwblContractWallet = await VWBLContractWalletFactory.deploy(
            [accounts[0].address, accounts[1].address, accounts[2].address],
            2,
            vwblGatewayV1Address,
            vwblGatewayV2Address,
            await stableCoinFeeRegistry.getAddress(),
            accounts[0].address,
            await withdrawExtraFeeRegistry.getAddress()
        )
        await vwblContractWallet.waitForDeployment()

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

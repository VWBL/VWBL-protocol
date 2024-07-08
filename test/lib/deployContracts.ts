import { ethers } from "hardhat"
import { ZeroAddress } from "ethers"

export const ZERO_ADDRESS = ZeroAddress
export const ONE_GWEI = 1_000_000_000
export const fee = ONE_GWEI

export async function deployContractsGatewayV2(ownerSigner: any, ownerAddress: string) {
    console.log("Starting deployContracts")
    try {
        const accounts = await ethers.getSigners()

        const testTokenAddress = ZERO_ADDRESS

        // StableCoinFeeRegistryのデプロイ
        const StableCoinFeeRegistryFactory = await ethers.getContractFactory("StableCoinFeeRegistry")
        const stableCoinFeeRegistry = await StableCoinFeeRegistryFactory.deploy(accounts[0].address)
        await stableCoinFeeRegistry.waitForDeployment()
        console.log("StableCoinFeeRegistry deployed to:", await stableCoinFeeRegistry.getAddress())

        // WithdrawExtraFeeコントラクトをデプロイ
        const WithdrawExtraFeeFactory = await ethers.getContractFactory("WithdrawExtraFee")
        const withdrawExtraFee = await WithdrawExtraFeeFactory.deploy(accounts[0].address)
        await withdrawExtraFee.waitForDeployment()
        console.log("WithdrawExtraFee deployed to:", await withdrawExtraFee.getAddress())

        // VWBLGatewayV1
        const VWBLGateway = await ethers.getContractFactory("VWBLGateway")
        const vwblGateway = await VWBLGateway.connect(ownerSigner).deploy(fee)
        await vwblGateway.waitForDeployment()
        const vwblGatewayV1Address = await vwblGateway.getAddress()
        console.log("VWBLGateway deployed to:", vwblGatewayV1Address)

        // GatewayProxy
        const GatewayProxy = await ethers.getContractFactory("GatewayProxy")
        const gatewayProxy = await GatewayProxy.deploy(vwblGatewayV1Address)
        await gatewayProxy.waitForDeployment()
        console.log("GatewayProxy deployed to:", await gatewayProxy.getAddress())

        // VWBLGatewayV2のデプロイ
        const VWBLGatewayV2Factory = await ethers.getContractFactory("VWBLGatewayV2")
        const vwblGatewayV2 = await VWBLGatewayV2Factory.deploy(
            accounts[0].address,
            vwblGatewayV1Address,
            await stableCoinFeeRegistry.getAddress(),
            await withdrawExtraFee.getAddress()
        )
        await vwblGatewayV2.waitForDeployment()
        const vwblGatewayV2Address = await vwblGatewayV2.getAddress()
        console.log("VWBLGatewayV2 deployed to:", vwblGatewayV2Address)

        // VWBLContractWalletのデプロイ
        const VWBLContractWalletFactory = await ethers.getContractFactory("VWBLContractWallet")
        const vwblContractWallet = await VWBLContractWalletFactory.deploy(
            [accounts[0].address, accounts[1].address, accounts[2].address],
            2,
            vwblGatewayV1Address,
            vwblGatewayV2Address,
            await stableCoinFeeRegistry.getAddress(),
            accounts[2].address,
            accounts[3].address
        )
        await vwblContractWallet.waitForDeployment()
        console.log("VWBLContractWallet deployed to:", await vwblContractWallet.getAddress())

        // ロールの確認
        const DEFAULT_ADMIN_ROLE = await vwblContractWallet.DEFAULT_ADMIN_ROLE()
        const OPERATOR_ROLE = await vwblContractWallet.OPERATOR_ROLE()
        const SET_FEE_ROLE = await vwblContractWallet.SET_FEE_ROLE()

        let hasAdminRole = await vwblContractWallet.hasRole(DEFAULT_ADMIN_ROLE, accounts[0].address)
        console.log("accounts[0] has DEFAULT_ADMIN_ROLE:", hasAdminRole)

        if (!hasAdminRole) {
            console.log("Granting DEFAULT_ADMIN_ROLE to accounts[0]")
            await vwblContractWallet.grantRole(DEFAULT_ADMIN_ROLE, accounts[0].address)
            hasAdminRole = await vwblContractWallet.hasRole(DEFAULT_ADMIN_ROLE, accounts[0].address)
            console.log("accounts[0] has DEFAULT_ADMIN_ROLE after granting:", hasAdminRole)
        }

        // 他のロールを付与
        await vwblContractWallet.connect(accounts[0]).grantRole(OPERATOR_ROLE, accounts[0].address)
        await vwblContractWallet.connect(accounts[0]).grantRole(SET_FEE_ROLE, accounts[0].address)

        console.log("Roles granted successfully")
        return {
            vwblContractWallet,
            stableCoinFeeRegistry,
            vwblGatewayV1Address,
            vwblGatewayV2Address,
            accounts,
            testTokenAddress,
        }
    } catch (error) {
        console.error("Error in deployContracts:", error)
        throw error
    }
}

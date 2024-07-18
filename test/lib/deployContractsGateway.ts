import hre, { ethers } from "hardhat"
import {
    AccessControlCheckerByERC1155,
    AllocateVWBLFee,
    GatewayProxy,
    VWBLERC1155ERC2981,
    VWBLGateway,
    VWBLGatewayV2,
    VWBLERC1155ERC2981ForMetadata,
    StableCoinFeeRegistry,
    WithdrawExtraFee,
    ValidatorRegistry,
    VWBLContractWallet,
} from "../../typechain-types"

export const ONE_GWEI = 1_000_000_000
export const fee = ONE_GWEI

export interface DeploymentInfo {
    vwblGateway: VWBLGateway
    vwblGatewayv2: VWBLGatewayV2
    gatewayProxy: GatewayProxy
    accessControlCheckerByERC1155: AccessControlCheckerByERC1155
    vwblERC1155ERC2981: VWBLERC1155ERC2981
    vwblERC1155Metadata: VWBLERC1155ERC2981ForMetadata
    stableCoinFeeRegistry: StableCoinFeeRegistry
    withdrawExtraFeeRegistry: WithdrawExtraFee
    validatorRegistry: ValidatorRegistry
    allocateVWBLFeeRegistry: AllocateVWBLFee
    vwblContractWallet: VWBLContractWallet
    validators: any[]
}

export async function deployContracts(ownerSigner: any, ownerAddress: string): Promise<DeploymentInfo> {
    console.log("Starting deployContractsGateway")
    const accounts = await ethers.getSigners()
    const validators = [accounts[0].address, accounts[1].address, accounts[2].address, accounts[3].address]

    // VWBLGatewayV1
    const VWBLGateway = await ethers.getContractFactory("VWBLGateway")
    const vwblGateway = await VWBLGateway.connect(ownerSigner).deploy(fee)
    await vwblGateway.waitForDeployment()
    await vwblGateway.waitForDeployment()
    const vwblGatewayV1Address = await vwblGateway.getAddress()

    const GatewayProxy = await hre.ethers.getContractFactory("GatewayProxy")
    const gatewayProxy = await GatewayProxy.deploy(await vwblGateway.getAddress())

    const StableCoinFeeRegistryFactory = await ethers.getContractFactory("StableCoinFeeRegistry")
    const stableCoinFeeRegistry = await StableCoinFeeRegistryFactory.deploy(accounts[0].address)
    await stableCoinFeeRegistry.waitForDeployment()

    const WithdrawExtraFeeFactory = await ethers.getContractFactory("WithdrawExtraFee")
    const withdrawExtraFeeRegistry = await WithdrawExtraFeeFactory.deploy(accounts[0].address)
    await withdrawExtraFeeRegistry.waitForDeployment()

    const VWBLGatewayV2 = await ethers.getContractFactory("VWBLGatewayV2")
    const vwblGatewayv2 = await VWBLGatewayV2.deploy(
        accounts[0].address,
        vwblGatewayV1Address,
        await stableCoinFeeRegistry.getAddress(),
        await withdrawExtraFeeRegistry.getAddress()
    )
    await vwblGatewayv2.waitForDeployment()
    const vwblGatewayV2Address = await vwblGatewayv2.getAddress()

    const AccessControlCheckerByERC1155 = await hre.ethers.getContractFactory("AccessControlCheckerByERC1155")
    const accessControlCheckerByERC1155 = await AccessControlCheckerByERC1155.connect(ownerSigner).deploy(
        ownerAddress,
        false,
        await gatewayProxy.getAddress()
    )

    const VWBLERC1155 = await hre.ethers.getContractFactory("VWBLERC1155ERC2981")
    const vwblERC1155ERC2981 = await VWBLERC1155.connect(ownerSigner).deploy(
        ownerAddress,
        "http://xxx.yyy.com",
        await gatewayProxy.getAddress(),
        await accessControlCheckerByERC1155.getAddress(),
        "Hello, VWBL"
    )

    const VWBLERC1155Metadata = await hre.ethers.getContractFactory("VWBLERC1155ERC2981ForMetadata")
    const vwblERC1155Metadata = await VWBLERC1155Metadata.connect(ownerSigner).deploy(
        ownerAddress,
        gatewayProxy.getAddress(),
        accessControlCheckerByERC1155.getAddress(),
        "Hello, VWBL"
    )

    const ValidatorRegistry = await ethers.getContractFactory("ValidatorRegistry")
    const validatorRegistry = await ValidatorRegistry.deploy(validators, 2, {
        gasLimit: 5000000,
    })
    await validatorRegistry.waitForDeployment()

    const AllocateVWBLFee = await ethers.getContractFactory("AllocateVWBLFee")
    const allocateVWBLFeeRegistry = await AllocateVWBLFee.deploy(
        [accounts[0].address, accounts[1].address, accounts[2].address],
        2,
        vwblGatewayV1Address,
        vwblGatewayV2Address,
        await stableCoinFeeRegistry.getAddress()
    )
    allocateVWBLFeeRegistry.waitForDeployment()

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
        vwblGateway,
        vwblGatewayv2,
        gatewayProxy,
        accessControlCheckerByERC1155,
        vwblERC1155ERC2981,
        vwblERC1155Metadata,
        stableCoinFeeRegistry,
        withdrawExtraFeeRegistry,
        validatorRegistry,
        allocateVWBLFeeRegistry,
        vwblContractWallet,
        validators,
    }
}

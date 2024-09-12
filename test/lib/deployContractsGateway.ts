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
    AccessControlCheckerByNFT,
    AccessCondition,
    ExternalNFT,
    VWBLERC721ERC2981,
    TransferVWBLNFT,
    VWBLERC721ERC2981ForMetadata,
} from "../../typechain-types"

export const ONE_GWEI = 1_000_000_000
export const fee = ONE_GWEI

export interface DeploymentInfo {
    vwblGateway: VWBLGateway
    vwblGatewayv2: VWBLGatewayV2
    gatewayProxy: GatewayProxy
    accessControlCheckerByNFT: AccessControlCheckerByNFT
    accessCondition: AccessCondition
    externalNFT: ExternalNFT
    vwblERC721: VWBLERC721ERC2981
    vwblERC721Metadata: VWBLERC721ERC2981ForMetadata
    transferVWBLNFTContract: TransferVWBLNFT
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
    console.log("Starting deployContracts")

    const accounts = await ethers.getSigners()
    const validators = [accounts[0].address, accounts[1].address, accounts[2].address, accounts[3].address]

    // Deploy VWBLGatewayV1
    const VWBLGatewayFactory = await ethers.getContractFactory("VWBLGateway")
    const vwblGateway = await VWBLGatewayFactory.connect(ownerSigner).deploy(fee)
    await vwblGateway.waitForDeployment()
    const vwblGatewayV1Address = await vwblGateway.getAddress()

    // Deploy GatewayProxy
    const GatewayProxyFactory = await hre.ethers.getContractFactory("GatewayProxy")
    const gatewayProxy = await GatewayProxyFactory.deploy(vwblGatewayV1Address)

    // Deploy StableCoinFeeRegistry
    const StableCoinFeeRegistryFactory = await ethers.getContractFactory("StableCoinFeeRegistry")
    const stableCoinFeeRegistry = await StableCoinFeeRegistryFactory.deploy(accounts[0].address)
    await stableCoinFeeRegistry.waitForDeployment()

    // Deploy WithdrawExtraFee
    const WithdrawExtraFeeFactory = await ethers.getContractFactory("WithdrawExtraFee")
    const withdrawExtraFeeRegistry = await WithdrawExtraFeeFactory.deploy(accounts[0].address)
    await withdrawExtraFeeRegistry.waitForDeployment()

    // Deploy VWBLGatewayV2
    const VWBLGatewayV2Factory = await ethers.getContractFactory("VWBLGatewayV2")
    const vwblGatewayv2 = await VWBLGatewayV2Factory.deploy(
        accounts[0].address,
        vwblGatewayV1Address,
        await stableCoinFeeRegistry.getAddress(),
        await withdrawExtraFeeRegistry.getAddress()
    )
    await vwblGatewayv2.waitForDeployment()
    const vwblGatewayV2Address = await vwblGatewayv2.getAddress()

    // Deploy AccessControlCheckerByERC1155
    const AccessControlCheckerByERC1155Factory = await hre.ethers.getContractFactory("AccessControlCheckerByERC1155")
    const accessControlCheckerByERC1155 = await AccessControlCheckerByERC1155Factory.connect(ownerSigner).deploy(
        ownerAddress,
        false,
        await gatewayProxy.getAddress()
    )

    // Deploy VWBLERC1155ERC2981
    const VWBLERC1155Factory = await hre.ethers.getContractFactory("VWBLERC1155ERC2981")
    const vwblERC1155ERC2981 = await VWBLERC1155Factory.connect(ownerSigner).deploy(
        ownerAddress,
        "http://xxx.yyy.com",
        await gatewayProxy.getAddress(),
        await accessControlCheckerByERC1155.getAddress(),
        "Hello, VWBL"
    )

    // Deploy VWBLERC1155ERC2981ForMetadata
    const VWBLERC1155MetadataFactory = await hre.ethers.getContractFactory("VWBLERC1155ERC2981ForMetadata")
    const vwblERC1155Metadata = await VWBLERC1155MetadataFactory.connect(ownerSigner).deploy(
        ownerAddress,
        gatewayProxy.getAddress(),
        accessControlCheckerByERC1155.getAddress(),
        "Hello, VWBL"
    )

    // Deploy AccessControlCheckerByNFT
    const AccessControlCheckerByNFTFactory = await ethers.getContractFactory("AccessControlCheckerByNFT")
    const accessControlCheckerByNFT = await AccessControlCheckerByNFTFactory.deploy(
        ownerAddress,
        true,
        gatewayProxy.getAddress()
    )

    // Deploy AccessCondition
    const AccessConditionFactory = await ethers.getContractFactory("AccessCondition")
    const accessCondition = await AccessConditionFactory.deploy()

    // Deploy ExternalNFT
    const ExternalNFTFactory = await ethers.getContractFactory("ExternalNFT")
    const externalNFT = await ExternalNFTFactory.deploy()

    // Deploy VWBLERC721ERC2981
    const VWBLERC721Factory = await ethers.getContractFactory("VWBLERC721ERC2981")
    const vwblERC721 = await VWBLERC721Factory.deploy(
        ownerAddress,
        "http://xxx.yyy.com",
        gatewayProxy.getAddress(),
        accessControlCheckerByNFT.getAddress(),
        "Hello, VWBL"
    )

    // Deploy TransferVWBLNFT
    const TransferVWBLNFTFactory = await ethers.getContractFactory("TransferVWBLNFT")
    const transferVWBLNFTContract = await TransferVWBLNFTFactory.deploy()

    // Deploy VWBLERC721ERC2981ForMetadata
    const VWBLMetadataFactory = await ethers.getContractFactory("VWBLERC721ERC2981ForMetadata")
    const vwblERC721Metadata = await VWBLMetadataFactory.connect(ownerSigner).deploy(
        ownerAddress,
        gatewayProxy.getAddress(),
        accessControlCheckerByNFT.getAddress(),
        "Hello, VWBL"
    )

    // Deploy ValidatorRegistry
    const ValidatorRegistryFactory = await ethers.getContractFactory("ValidatorRegistry")
    const validatorRegistry = await ValidatorRegistryFactory.deploy(validators, 2, {
        gasLimit: 5000000,
    })
    await validatorRegistry.waitForDeployment()

    // Deploy AllocateVWBLFee
    const AllocateVWBLFeeFactory = await ethers.getContractFactory("AllocateVWBLFee")
    const allocateVWBLFeeRegistry = await AllocateVWBLFeeFactory.deploy(
        [accounts[0].address, accounts[1].address, accounts[2].address],
        2,
        vwblGatewayV1Address,
        vwblGatewayV2Address,
        await stableCoinFeeRegistry.getAddress()
    )
    await allocateVWBLFeeRegistry.waitForDeployment()

    // Deploy VWBLContractWallet
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
        accessControlCheckerByNFT,
        accessCondition,
        externalNFT,
        vwblERC721,
        vwblERC721Metadata,
        transferVWBLNFTContract,
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

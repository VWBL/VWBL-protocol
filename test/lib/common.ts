import hre from "hardhat";
import {
    AccessControlCheckerByERC1155,
    GatewayProxy,
    VWBLERC1155ERC2981,
    VWBLGateway,
    VWBLERC1155ERC2981ForMetadata
} from "../../typechain-types"


export const ONE_GWEI = 1_000_000_000;
export const fee = ONE_GWEI;

export interface DeploymentInfo {
    vwblGateway: VWBLGateway;
    gatewayProxy: GatewayProxy;
    accessControlCheckerByERC1155: AccessControlCheckerByERC1155;
    vwblERC1155ERC2981: VWBLERC1155ERC2981;
    vwblERC1155Metadata: VWBLERC1155ERC2981ForMetadata;
}

export async function deployContracts(ownerSigner: any, ownerAddress: string): Promise<DeploymentInfo> {
    const VWBLGateway = await hre.ethers.getContractFactory("VWBLGateway");
        const vwblGateway = await VWBLGateway.connect(ownerSigner).deploy(fee);

        const GatewayProxy = await hre.ethers.getContractFactory("GatewayProxy")
        const gatewayProxy = await GatewayProxy.deploy(await vwblGateway.getAddress())

        const AccessControlCheckerByERC1155 = await hre.ethers.getContractFactory("AccessControlCheckerByERC1155")
        const accessControlCheckerByERC1155 = await AccessControlCheckerByERC1155.connect(ownerSigner).deploy(ownerAddress, false, await gatewayProxy.getAddress())

        const VWBLERC1155 = await hre.ethers.getContractFactory("VWBLERC1155ERC2981")
        const vwblERC1155ERC2981 = await VWBLERC1155.connect(ownerSigner).deploy(
            ownerAddress,
            "http://xxx.yyy.com",
            await gatewayProxy.getAddress(),
            await accessControlCheckerByERC1155.getAddress(),
            "Hello, VWBL"
        )

        const VWBLERC1155Metadata = await hre.ethers.getContractFactory("VWBLERC1155ERC2981ForMetadata")
        const vwblERC1155Metadata = await VWBLERC1155Metadata.connect(ownerSigner).deploy(ownerAddress, gatewayProxy.getAddress(), accessControlCheckerByERC1155.getAddress(), "Hello, VWBL")

        return {vwblGateway, gatewayProxy, accessControlCheckerByERC1155, vwblERC1155ERC2981, vwblERC1155Metadata};
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @dev Interface of the VWBL Gateway as defined in the
 * https://github.com/VWBL-protocol/contracts/ERC721/gateway/VWBLGateway.sol
 */
interface IVWBLGateway {
    event accessControlAddedToNFT(bytes32 documentId, address contractAddress, uint256 tokenId);
    event accessControlAddedToContract(bytes32 documentId, address contractAddress);
    event feeWeiChanged(uint256 oldPercentage, uint256 newPercentage);
    event permissionAdded(bytes32 documentId, address contractAddress, uint256 tokenId);

    function getToken(bytes32 documentId) external view returns (address contractAddress, uint256 tokenId);

    function hasAccessControl(address user, bytes32 documentId) external view returns (bool);

    function grantAccessControlToNFT(
        bytes32 documentId,
        address contractAddress,
        uint256 tokenId
    ) external payable;

    function grantAccessControlToContract(
        bytes32 documentId,
        address contractAddress
    ) external payable;

    function withdrawFee() external;

    function setFeeWei(uint256 newFeeWei) external;

    function feeWei() external view returns (uint256);

    function setAccessControlCheckerByNFT(address newContract) external;
}

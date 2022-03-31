// SPDX-License-Identifier: ISC
pragma solidity ^0.8.0;

/**
 * @dev Interface of the VWBL Gateway as defined in the
 * https://github.com/VWBL/VWBL-Gateway-Contract
 */
interface IVWBLGateway {
    event accessControlAdded(bytes32 documentId, address contractAddress, uint256 tokenId);
    event feeWeiChanged(uint256 oldPercentage, uint256 newPercentage);
    event permissionAdded(bytes32 documentId, address contractAddress, uint256 tokenId);

    function hasAccessControl(address user, bytes32 documentId) external view returns (bool);

    function grantAccessControl(
        bytes32 documentId,
        address contractAddress,
        uint256 tokenId
    ) external payable;

    function withdrawFee() external;

    function setFeeWei(uint256 newFeeWei) external;

    function feeWei() external returns (uint256);
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @dev Interface of the VWBL Gateway as defined in the
 * https://github.com/VWBL-protocol/contracts/ERC721/gateway/VWBLGateway.sol
 */
interface IVWBLGateway {
    function getDocumentIds() external view returns (bytes32[] memory);

    function hasAccessControl(address user, bytes32 documentId) external view returns (bool);

    function grantAccessControl(
        bytes32 documentId,
        address conditionContractAddress
    ) external payable;

    function withdrawFee() external;

    function setFeeWei(uint256 newFeeWei) external;

    function feeWei() external view returns (uint256);
}
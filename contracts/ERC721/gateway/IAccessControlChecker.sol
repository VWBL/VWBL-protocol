// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @dev Interface of the VWBL Access Control Checker as defined in the
 * https://github.com/VWBL-protocol/contracts/ERC721/gateway/AcessControlChecker.sol
 */
interface IAccessControlChecker {
    function checkAccessControl(address user, bytes32 documentId) external view returns (bool);
}

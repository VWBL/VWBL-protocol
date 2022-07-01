// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IAccessControlChecker {
    function checkAccessControl(address user, bytes32 documentId) external view returns (bool);
}

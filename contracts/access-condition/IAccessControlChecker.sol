// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IAccessControlChecker {
    /**
     * @dev Return whether user has access right of digital content
     *      This function is called by VWBLGateway contract
     * @param user The address of decryption key requester
     * @param documentId The Identifier of digital content and decryption key
     * @return True if user has access rights of digital content
     */
    function checkAccessControl(address user, bytes32 documentId) external view returns (bool);
}

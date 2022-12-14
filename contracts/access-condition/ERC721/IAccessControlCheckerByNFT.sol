// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "../IAccessControlChecker.sol";

interface IAccessControlCheckerByNFT is IAccessControlChecker {
    /**
     * @notice Grant access control to NFT and register access condition of digital content
     * @param documentId The Identifier of digital content and decryption key
     * @param nftContract The contract address of NFT
     * @param tokenId The Identifier of NFT
     */
    function grantAccessControlAndRegisterNFT(
        bytes32 documentId,
        address nftContract,
        uint256 tokenId
    ) external payable;
}

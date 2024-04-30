// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

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

    /**
     * @notice Batch grant access control, register access condition and NFT info
     * @param documentIds An array of Identifiers for the digital content and decryption keys
     * @param minter The address of the digital content creator for all provided document IDs
     * @param nftContract The contract address of the NFT
     * @param tokenIds An array of Identifiers for the NFTs corresponding to each document ID
     */
    function batchGrantAccessControlAndRegisterNFT(
        bytes32[] memory documentIds,
        address minter,
        address nftContract,
        uint256[] memory tokenIds
    ) external payable;
}

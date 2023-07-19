// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "../../IVWBL.sol";

/**
 * @dev Interface of the VWBL Gateway as defined in the
 * https://github.com/VWBL-protocol/contracts/ERC1155/extensions/VWBLERC1155Metadata.sol
 */
interface IVWBLERC1155Metadata is IVWBL {
    /**
     * @notice Mint NFT, grant access feature and register access condition of digital content.
     * @param _metadataURl The URl of nft metadata
     * @param _getKeyURl The URl of VWBL Network(Key management network)
     * @param _royaltiesPercentage Royalty percentage of NFT
     * @param _documentId The Identifier of digital content and decryption key
     */
    function mint(
        string memory _metadataURl,
        string memory _getKeyURl,
        uint256 _royaltiesPercentage,
        bytes32 _documentId
    ) external payable returns (uint256);
}

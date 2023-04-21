// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

/**
 * @dev Interface of the VWBL Gateway as defined in the
 * https://github.com/VWBL-protocol/contracts/ERC1155/extensions/VWBLERC1155Metadata.sol
 */
interface IVWBLERC1155Metadata {
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

    /**
     * @notice Batch mint ERC1155, grant access feature and register access condition of digital content.
     * @param _metadataURl The URl of nft metadata
     * @param _getKeyURl The Url of VWBL Network(Key management network)
     * @param _amounts The array of token quantity
     * @param _royaltiesPercentages Array of Royalty percentage of ERC1155
     * @param _documentIds The array of Identifier of digital content and decryption key
     */
    function mintBatch(
        string memory _metadataURl,
        string memory _getKeyURl,
        uint256[] memory _amounts,
        uint256[] memory _royaltiesPercentages,
        bytes32[] memory _documentIds
    ) external payable returns (uint256[] memory);

    /**
     * @notice Get minter of NFT by tokenId
     * @param tokenId The Identifier of NFT
     */
    function getMinter(uint256 tokenId) external view returns (address);
}

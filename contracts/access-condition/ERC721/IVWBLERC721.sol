// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "../IVWBLSettings.sol";
import "@openzeppelin/contracts/interfaces/IERC2981.sol";

/**
 * @dev Interface of the VWBL NFT as defined in the
 * https://github.com/VWBL-protocol/contracts/ERC721/VWBL.sol
 */
interface IVWBLERC721 is IVWBLSettings, IERC2981{
    /**
     * @notice Mint NFT, grant access feature and register access condition of digital content.
     * @param _getKeyURl The URl of VWBL Network(Key management network)
     * @param _royaltiesPercentage Royalty percentage of NFT
     * @param _documentId The Identifier of digital content and decryption key
     */
    function mint(
        string memory _getKeyURl,
        uint256 _royaltiesPercentage,
        bytes32 _documentId
    ) external payable returns (uint256);
}

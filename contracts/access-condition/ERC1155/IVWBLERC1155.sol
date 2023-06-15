// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "../IVWBLSettings.sol";

/**
 * @dev Interface of the VWBL ERC1155 as defined in the
 * https://github.com/VWBL-protocol/contracts/ERC1155/VWBLERC1155.sol
 */
interface IVWBLERC1155 is IVWBLSettings{
    /**
     * @notice Mint ERC1155, grant access feature and register access condition of digital content.
     * @param _getKeyURl The Url of VWBL Network(Key management network)
     * @param _amount The token quantity
     * @param _royaltiesPercentage Royalty percentage of ERC1155
     * @param _documentId The Identifier of digital content and decryption key
     */
    function mint(
        string memory _getKeyURl,
        uint256 _amount,
        uint256 _royaltiesPercentage,
        bytes32 _documentId
    ) external payable returns (uint256);
}

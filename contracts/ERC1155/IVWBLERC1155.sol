// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @dev Interface of the VWBL ERC1155 as defined in the
 * https://github.com/VWBL-protocol/contracts/ERC1155/VWBLERC1155.sol
 */
interface IVWBLERC1155 {
    function getFee() external view returns (uint256);
    
    function mint(
        string memory _getKeyUrl,
        uint256 _amount,
        uint256 _royaltiesPercentage,
        bytes32 _documentId
    ) external payable returns (uint256);

    function mintBatch(
        string memory _getKeyUrl,
        uint256[] memory _amounts,
        uint256[] memory _royaltiesPercentages
    ) external payable;
    
    function getMinter(uint256 tokenId) external view returns (address);
}
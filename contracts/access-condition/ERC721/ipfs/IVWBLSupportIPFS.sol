// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @dev Interface of the VWBL Gateway as defined in the
 * https://github.com/VWBL-protocol/contracts/ERC721/VWBL.sol
 */
interface IVWBLSupportIPFS {
    function getFee() external view returns (uint256);
    
    function mint(
        string memory _metadataURl,
        string memory _getKeyURl, 
        uint256 _royaltiesPercentage, 
        bytes32 _documentId
    ) external payable returns (uint256);
    
    function getMinter(uint256 tokenId) external view returns (address);
}
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

interface IVWBL {
    /**
     * @notice Get VWBL Fee
     */
    function getFee() external view returns (uint256);

    /**
     * @notice Get Gateway Address
     */
    function getGatewayAddress() external view returns (address);

    /**
     * @notice Get a message to be signed of this contract
     */
    function getSignMessage() external view returns (string memory);

    /**
     * @notice Set the message to be signed of this contract
     */
    function setSignMessage(string calldata _signMessage) external;

    /**
     * @notice Get Access-Control-Allow-Origin for VWBL Network to return decryption key
     */
    function getAllowOrigins() external view returns (string memory);

    /**
     * @notice Set Access-Control-Allow-Origin for VWBL Network to return decryption key
     */
    function setAllowOrigins(string memory) external;

    /**
     * @notice Get minter of NFT by tokenId
     * @param tokenId The Identifier of NFT
     */
    function getMinter(uint256 tokenId) external view returns (address);

    /**
     * @notice Get minter of NFT by tokenId
     * @param minter The minter of NFT
     */
    function getTokenByMinter(address minter) external view returns (uint256[] memory);

    /**
     * @notice Grant view permission to grantee from nft owner
     * @param tokenId The identifier of NFT
     * @param grantee The Address who grantee of view permission right
     */
    function grantViewPermission(uint256 tokenId, address grantee) external returns (uint256);

    /**
     * @notice Check view permission to user
     * @param tokenId The Identifier of NFT
     * @param user The address of verification target
     */
    function checkViewPermission(uint256 tokenId, address user) external view returns (bool);
}

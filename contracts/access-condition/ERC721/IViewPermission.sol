// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

interface IViewPermission {
    /**
     * @notice Grant view permission to grantee from nft owner
     * @param tokenId The identifier of NFT
     * @param grantee The Address who grantee of view permission right
     */
    function grantViewPermission(uint256 tokenId, address grantee) external returns (uint256);

    /**
     * @notice Revoke view permission from nft owner
     * @param tokenId The identifier of the NFT
     * @param revoker The address revoking the view permission
     * @return The tokenId of the NFT token
     */
    function revokeViewPermission(uint256 tokenId, address revoker) external returns (uint256);

    /**
     * @notice Check view permission to user
     * @param tokenId The Identifier of NFT
     * @param user The address of verification target
     */
    function checkViewPermission(uint256 tokenId, address user) external view returns (bool);
}

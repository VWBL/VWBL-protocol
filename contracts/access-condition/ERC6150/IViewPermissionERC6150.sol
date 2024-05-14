// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "../ERC721/IViewPermission.sol";

interface IViewPermissionERC6150 is IViewPermission {
    /**
     * @notice Grant view permission to a specific address for a specific ERC6150 token from ERC6150 owner.
     * @param tokenId The identifier of the ERC6150 token.
     * @param grantee The address to which view permission will be granted.
     * @param toDir A boolean indicating whether to grant view permission directly or single ERC6150 token.
     * @return The tokenId of the ERC6150 token for which permission was granted.
     */
    function grantViewPermission(
        uint256 tokenId,
        address grantee,
        bool toDir
    ) external returns (uint256);

    /**
     * @notice Revoke ancestor permission from ERC6150 owner
     * @param tokenId The identifier of the ERC6150
     * @param revoker The address revoking the ancestor permission
     * @return The tokenId of the ERC6150
     */
    function revokeDirPermission(uint256 tokenId, address revoker) external returns (uint256);

    /**
     * @notice Check if the user has Directory(ERC6150 under parent token) permission for a specific ERC6150
     * @param tokenId The identifier of the ERC6150
     * @param user The address of verification target
     * @return A boolean indicating whether the user has ancestor permission
     */
    function checkDirPermission(uint256 tokenId, address user) external view returns (bool);
}

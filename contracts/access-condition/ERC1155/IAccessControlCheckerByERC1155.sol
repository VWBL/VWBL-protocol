// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../IAccessControlChecker.sol";

interface IAccessControlCheckerByERC1155 is IAccessControlChecker {
    function grantAccessControlAndRegisterERC1155(
        bytes32 documentId,
        address erc1155Contract,
        uint256 tokenId
    ) external payable;

    function batchGrantAccessControlAnderRegisterERC1155(
        bytes32[] memory documentIds,
        address erc1155Contract,
        uint256[] memory tokenIds,
        address minter
    ) external payable;
}

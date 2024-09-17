// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

import "../IAccessControlChecker.sol";

interface IAccessControlCheckerByERC1155 is IAccessControlChecker {
    function grantAccessControlAndRegisterERC1155(
        bytes32 documentId,
        address erc1155Contract,
        uint256 tokenId
    ) external payable;

    function batchGrantAccessControlAndRegisterERC1155(
        bytes32[] memory documentIds,
        address erc1155Contract,
        uint256[] memory tokenIds,
        address minter
    ) external payable;

    function grantAccessControlWithERC20AndRegisterERC1155(
        bytes32 documentId,
        address erc1155Contract,
        uint256 tokenId,
        address erc20Address,
        address feePayer
    ) external;

    function batchGrantAccessControlWithERC20AndRegisterERC1155(
        bytes32[] memory documentIds,
        address erc1155Contract,
        uint256[] memory tokenIds,
        address minter,
        address erc20Address,
        address feePayer
    ) external;
}

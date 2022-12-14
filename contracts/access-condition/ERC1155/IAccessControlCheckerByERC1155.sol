// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "../IAccessControlChecker.sol";

interface IAccessControlCheckerByERC1155 is IAccessControlChecker {
    function grantAccessControlAndRegisterERC1155(
        bytes32 documentId,
        address erc1155Contract,
        uint256 tokenId
    ) external payable;
}

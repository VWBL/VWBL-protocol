// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IAccessControlCheckerByERC1155 {
    function grantAccessControlAndRegisterERC1155(bytes32 documentId, address erc1155Contract, uint256 tokenId) external payable;
}

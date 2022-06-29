// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IAccessControlCheckerByNFT {
    function grantAccessControlAndRegisterNFT(bytes32 documentId, address nftContract, uint256 tokenId) external payable;
}

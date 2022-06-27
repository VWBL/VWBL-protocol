// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

contract GrantAccessControl {
    struct Token {
        address contractAddress;
        uint256 tokenId;
    }
    mapping(bytes32 => Token) public documentIdToToken;

    mapping(bytes32 => address) public documentIdToContract;
    bytes32[] public documentIds;

    uint256 public feeWei = 1000000000000000000; // 1MATIC
    uint256 public pendingFee;

    event accessControlAddedToNFT(bytes32 documentId, address contractAddress, uint256 tokenId);
    event accessControlAddedToContract(bytes32 documentId, address contractAddress);

    function getToken(bytes32 documentId) public view returns (address contractAddress, uint256 tokenId) {
        return (documentIdToToken[documentId].contractAddress, documentIdToToken[documentId].tokenId);
    }

    function grantAccessControlToNFT(
        bytes32 documentId,
        address contractAddress,
        uint256 tokenId
    ) public payable {
        require(msg.value <= feeWei, "Fee is too high");
        require(msg.value >= feeWei, "Fee is insufficient");
        require(
            documentIdToToken[documentId].contractAddress == address(0)
            && documentIdToContract[documentId] == address(0),
            "documentId is already used"
        );

        pendingFee += msg.value;
        _addAccessControlToNFT(documentId, contractAddress, tokenId);
        documentIds.push(documentId);
    }

    function grantAccessControlToContract(
        bytes32 documentId,
        address contractAddress
    ) public payable {
        require(msg.value <= feeWei, "Fee is too high");
        require(msg.value >= feeWei, "Fee is insufficient");
        require(
            documentIdToToken[documentId].contractAddress == address(0)
            && documentIdToContract[documentId] == address(0),
            "documentId is already used"
        );
        
        pendingFee += msg.value;
        _addAccessControlToContract(documentId, contractAddress);
        documentIds.push(documentId);
    }

    function _addAccessControlToNFT(
        bytes32 documentId,
        address contractAddress,
        uint256 tokenId
    ) private {
        documentIdToToken[documentId].contractAddress = contractAddress;
        documentIdToToken[documentId].tokenId = tokenId;

        emit accessControlAddedToNFT(documentId, contractAddress, tokenId);
    }

    function _addAccessControlToContract(
        bytes32 documentId,
        address contractAddress
    ) private {
        documentIdToContract[documentId] = contractAddress;

        emit accessControlAddedToContract(documentId, contractAddress);
    }
}
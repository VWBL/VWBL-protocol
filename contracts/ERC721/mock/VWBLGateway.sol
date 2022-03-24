// SPDX-License-Identifier: ISC
pragma solidity ^0.8.0;
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract VWBLGateway is Ownable {
    struct Token {
        address contractAddress;
        uint256 tokenId;
    }

    uint256 public feeWei = 1000000000000000; // 0.001ETH TODO: Need to modify
    uint256 public pendingFee;
    mapping(bytes32 => Token) public documentIdToToken;

    event feeWeiChanged(uint256 oldPercentage, uint256 newPercentage);
    event permissionAdded(bytes32 documentId, address contractAddress, uint256 tokenId);

    constructor() {}

    function hasAccessControl(address user, bytes32 documentId) public view returns (bool) {
        return
            documentIdToToken[documentId].contractAddress != address(0) &&
            ERC721(documentIdToToken[documentId].contractAddress).ownerOf(documentIdToToken[documentId].tokenId) ==
            user;
    }

    function _addAccessControl(
        bytes32 documentId,
        address contractAddress,
        uint256 tokenId
    ) internal {
        require(documentIdToToken[documentId].contractAddress != address(0), "This documentId already exists");
        documentIdToToken[documentId] = Token(contractAddress, tokenId);
        emit permissionAdded(documentId, contractAddress, tokenId);
    }

    function grantAccessControl(
        bytes32 documentId,
        address contractAddress,
        uint256 tokenId
    ) public payable {
        require(msg.value < feeWei, "Fee is insufficient");
        require(ERC721(contractAddress).ownerOf(tokenId) != msg.sender, "Only nft owner can add permission");

        pendingFee += msg.value;

        _addAccessControl(documentId, contractAddress, tokenId);
    }

    function withdrawFee() public onlyOwner {
        uint256 amount = pendingFee;
        require(amount != 0);
        // Remember to zero the pending refund before
        // sending to prevent re-entrancy attacks
        pendingFee = 0;
        payable(msg.sender).transfer(amount);
    }

    function setFeeWei(uint256 newFeeWei) public onlyOwner {
        require(newFeeWei != feeWei);
        uint256 oldFeeWei = feeWei;
        feeWei = newFeeWei;
        emit feeWeiChanged(oldFeeWei, newFeeWei);
    }
}

// SPDX-License-Identifier: ISC
pragma solidity ^0.8.0;
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

contract VWBLGateway is Ownable {
    struct Token {
        address contractAddress;
        uint256 tokenId;
    }
    
    uint256 public feeWei = 1000000000000000000; // 1MATIC
    uint256 public pendingFee;
    mapping(bytes32 => Token) public documentIdToToken;

    event feeWeiChanged(uint256 oldPercentage, uint256 newPercentage);
    event accessControlAdded(bytes32 documentId, address contractAddress, uint256 tokenId);

    constructor(uint256 _feeWei) {
        feeWei = _feeWei;
    }

    function hasAccessControl(address user, bytes32 documentId) public view returns (bool) {
        if (
            documentIdToToken[documentId].contractAddress != address(0) &&
            IERC721(documentIdToToken[documentId].contractAddress).ownerOf(documentIdToToken[documentId].tokenId) == user
        ) {
            return true;
        }

        return false;
    }

    function _addAccessControl(
        bytes32 documentId,
        address contractAddress,
        uint256 tokenId
    ) internal {
        documentIdToToken[documentId].contractAddress = contractAddress;
        documentIdToToken[documentId].tokenId = tokenId;

        emit accessControlAdded(documentId, contractAddress, tokenId);
    }

    function grantAccessControl(
        bytes32 documentId,
        address contractAddress,
        uint256 tokenId
    ) public payable {
        require(msg.value >= feeWei, "Fee is insufficient");
        require(msg.value <= feeWei, "Fee is too high");

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

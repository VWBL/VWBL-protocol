// SPDX-License-Identifier: ISC
pragma solidity ^0.8.0;
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

contract VWBLGateway is Ownable {
    struct Token {
        address contractAddress;
        uint256 tokenId;
    }
    Token[] public tokens;
    uint256 public feeWei = 1000000000000000000; // 1MATIC
    uint256 public pendingFee;
    mapping(bytes32 => uint256[]) private documentIdToTokenKeys;

    event feeWeiChanged(uint256 oldPercentage, uint256 newPercentage);
    event accessControlAdded(bytes32 documentId, address contractAddress, uint256 tokenId);

    constructor(uint256 _feeWei) {
        feeWei = _feeWei;
    }

    function hasAccessControl(address user, bytes32 documentId) public view returns (bool) {
        uint256 tokenLength = documentIdToTokenKeys[documentId].length;
        if (tokenLength < 1) return false;
        for (uint32 i = 0; i < tokenLength; i++) {
            uint256 tokenKey = documentIdToTokenKeys[documentId][i];
            if (
                tokens[tokenKey].contractAddress != address(0) &&
                IERC721(tokens[tokenKey].contractAddress).ownerOf(tokens[tokenKey].tokenId) == user
            ) {
                return true;
            }
        }

        return false;
    }

    function _addAccessControl(
        bytes32 documentId,
        address contractAddress,
        uint256 tokenId
    ) internal {
        tokens.push(Token(contractAddress, tokenId));
        documentIdToTokenKeys[documentId].push(tokens.length - 1);

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

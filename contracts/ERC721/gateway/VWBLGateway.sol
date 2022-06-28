// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./GrantAccessControl.sol";
import "./IAccessControlChecker.sol";
import "./AccessControlCheckerByNFT.sol";

contract VWBLGateway is GrantAccessControl, Ownable {
    address public accessControlCheckerByNFT;

    event feeWeiChanged(uint256 oldPercentage, uint256 newPercentage);
    event accessControlCheckerByNFTChanged(address oldContract, address newContract);
    
    constructor(uint256 _feeWei) {
        AccessControlCheckerByNFT _contract = new AccessControlCheckerByNFT(address(this));
        accessControlCheckerByNFT = address(_contract);
        feeWei = _feeWei;
    }

    function hasAccessControl(address user, bytes32 documentId) public view returns (bool) {
        if (documentIdToToken[documentId].contractAddress != address(0)) {
            return IAccessControlChecker(accessControlCheckerByNFT).checkAccessControl(user, documentId);
        } else if (documentIdToContract[documentId] != address(0)) {
            return IAccessControlChecker(documentIdToContract[documentId]).checkAccessControl(user, documentId);
        }

        return false;
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

    function getNFTDatas() public view returns (bytes32[] memory, Token[] memory){
        Token[] memory tokens = new Token[](documentIds.length);
        for (uint32 i = 0; i < documentIds.length; i++) {
            tokens[i] = documentIdToToken[documentIds[i]];
        }
        return (documentIds, tokens);
    }

    function setAccessControlCheckerByNFT(address newContract) public onlyOwner {
        require(newContract != accessControlCheckerByNFT);
        address oldContract = accessControlCheckerByNFT;
        accessControlCheckerByNFT = newContract;
        emit accessControlCheckerByNFTChanged(oldContract, newContract);
    }
}

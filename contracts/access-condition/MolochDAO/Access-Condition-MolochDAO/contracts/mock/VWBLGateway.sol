// SPDX-License-Identifier: MIT
pragma solidity ^0.5.2;

import "../IAccessControlChecker.sol";
import "../IVWBLGateway.sol";

contract VWBLGateway is IVWBLGateway {
    mapping (bytes32 => address) public documentIdToConditionContract;
    bytes32[] public documentIds;

    uint256 public feeWei = 1000000000000000000; // 1MATIC
    uint256 public pendingFee;

    event accessControlAdded(bytes32 documentId, address conditionContract);
    event feeWeiChanged(uint256 oldPercentage, uint256 newPercentage);
    
    constructor(uint256 _feeWei) public {
        feeWei = _feeWei;
    }

    function getDocumentIds() public view returns (bytes32[] memory) {
        return documentIds;
    }

    function hasAccessControl(address user, bytes32 documentId) public view returns (bool) {
        address accessConditionContractAddress = documentIdToConditionContract[documentId];
        if (accessConditionContractAddress != address(0)) {
            return IAccessControlChecker(accessConditionContractAddress).checkAccessControl(user, documentId);
        }

        return false;
    }

    function grantAccessControl(
        bytes32 documentId,
        address conditionContractAddress
    ) public payable {
        require(msg.value <= feeWei, "Fee is too high");
        require(msg.value >= feeWei, "Fee is insufficient");
        require(
            documentIdToConditionContract[documentId] == address(0),
            "documentId is already used"
        );
        
        pendingFee += msg.value;
        documentIdToConditionContract[documentId] = conditionContractAddress;
        documentIds.push(documentId);

        emit accessControlAdded(documentId, conditionContractAddress);
    }
}


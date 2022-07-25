// SPDX-License-Identifier: MIT
pragma solidity ^0.5.2;

import "./IAccessControlChecker.sol";
import "./dependencies/Moloch.sol";
import "./IVWBLGateway.sol";

contract AccessControlCheckerByDAOMember is IAccessControlChecker {
    Moloch public molochContract;
    address public vwblGateway;

    struct Info {
        address author;
        string name;
        string encryptedDataUrl;
    }

    mapping(bytes32 => Info) public documentIdToInfo;
    mapping(bytes32 => bool) public existDocumentId; 
    bytes32[] public documentIds;

    event grantedAccessControl(bytes32 documentId);

    constructor(address _moloch, address _vwblGateway) public {
        molochContract = Moloch(_moloch);
        vwblGateway = _vwblGateway;
    }

    function getDocumentIds() external view returns (bytes32[] memory) {
        return documentIds;
    }

    function checkAccessControl(
        address user,
        bytes32 documentId
    ) external view returns (bool) {
        (,uint256 shares, uint256 loot,,,) = molochContract.members(user);
    
        if (
            existDocumentId[documentId]
            && (shares > 0 || loot > 0)
        ) {
            return true;
        }

        return false;
    }

    function grantAccessControlToDAOMember(
        bytes32 documentId,
        address author,
        string calldata name,
        string calldata encryptedDataUrl
    ) external payable returns (bytes32) {
        IVWBLGateway(vwblGateway).grantAccessControl.value(msg.value)(documentId, address(this));

        documentIdToInfo[documentId].author = author;
        documentIdToInfo[documentId].name = name;
        documentIdToInfo[documentId].encryptedDataUrl = encryptedDataUrl;
        existDocumentId[documentId] = true;
        documentIds.push(documentId);

        emit grantedAccessControl(documentId);
        return documentId;
    }
}
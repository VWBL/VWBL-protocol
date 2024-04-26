// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

import "../../IAccessControlChecker.sol";

contract AccessCondition is IAccessControlChecker {
    bool condition = true;

    constructor() {}

    function checkAccessControl(address user, bytes32 documentId) external view returns (bool) {
        return condition;
    }

    function setCondition(bool _condition) public {
        condition = _condition;
    }

    function getOwnerAddress(bytes32 documentId) external view returns (address) {
        return address(0);
    }
}

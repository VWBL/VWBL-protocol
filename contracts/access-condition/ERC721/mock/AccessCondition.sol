// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "../../IAccessControlChecker.sol";

contract AccessCondition is IAccessControlChecker {
    bool condition = true;

    constructor() public {}

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

// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

import "./IAccessControlChecker.sol";

abstract contract AbstractControlChecker is IAccessControlChecker {
    struct Token {
        address contractAddress;
        uint256 tokenId;
    }
    mapping(bytes32 => Token) public documentIdToToken;
    // if true minter has only set key rights and doesn't have viewing rights,
    // if false minter has set key and viewing rights.
    bool public setMinterHasOnlySetKeyRights;

    constructor(bool _setMinterHasOnlySetKeyRights) {
        setMinterHasOnlySetKeyRights = _setMinterHasOnlySetKeyRights;
    }
}

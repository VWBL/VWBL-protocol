pragma solidity ^0.8.20;

import "./ValidatorRegistry.sol";

contract VWBLContractWallet is ValidatorRegistry {

    constructor(
        address[] memory _owners,
        uint _required
    ) ValidatorRegistry(_owners, _required) {

    }



}
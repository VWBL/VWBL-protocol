// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./IGatewayProxy.sol";

/**
 * @dev return VWBL Gateway address.
 */
contract GatewayProxy is Ownable, IGatewayProxy {
    address gatewayAddress;
    event gatewayContractChanged(address oldGatewayContract, address newGatewayContract);

    constructor(address _gatewayAddress) {
        gatewayAddress = _gatewayAddress;
    }

    function setGatewayAddress(address _gatewayAddress) public onlyOwner {
        require(gatewayAddress != _gatewayAddress, "same address");
        address old = gatewayAddress;
        gatewayAddress = _gatewayAddress;
        emit gatewayContractChanged(old, _gatewayAddress);
    }

    function getGatewayAddress() public view returns (address) {
        return gatewayAddress;
    }
}

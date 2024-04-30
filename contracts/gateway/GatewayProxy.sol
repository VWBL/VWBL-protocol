// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./IGatewayProxy.sol";

/**
 * @dev return VWBL Gateway address.
 */
contract GatewayProxy is Ownable, IGatewayProxy {
    address gatewayAddress;
    event gatewayContractChanged(address oldGatewayContract, address newGatewayContract);

    constructor(address _gatewayAddress) Ownable(msg.sender) {
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

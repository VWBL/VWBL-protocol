// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./IVWBLSettings.sol";
import "../gateway/IGatewayProxy.sol";
import "../gateway/IVWBLGateway.sol";

abstract contract AbstractVWBLSettings is IVWBLSettings, Ownable {
    address public gatewayProxy;
    string private signMessage;
    string[] private allowOrigins;

    constructor(address _gatewayProxy, string memory _signMessage) {
        gatewayProxy = _gatewayProxy;
        signMessage = _signMessage;
    }

    function getGatewayAddress() public view returns (address) {
        return IGatewayProxy(gatewayProxy).getGatewayAddress();
    }

    /**
     * @notice Get VWBL Fee
     */
    function getFee() public view returns (uint256) {
        return IVWBLGateway(getGatewayAddress()).feeWei();
    }

    /**
     * @notice Get the message to be signed of this contract
     */
    function getSignMessage() public view returns (string memory) {
        return signMessage;
    }

    /**
     * @notice Set the message to be signed of this contract
     */
    function setSignMessage(string calldata _signMessage) public onlyOwner {
        signMessage = _signMessage;
    }

    function getAllowOrigins() public view returns (string[] memory) {
        return allowOrigins;
    }

    function setAllowOrigin(string memory _origin) public onlyOwner {
        allowOrigins.push(_origin);
    }

    function removeAllowOrigin(uint16 index) public onlyOwner {
        require(index < allowOrigins.length, "index is invalid");
        allowOrigins[index] = allowOrigins[allowOrigins.length - 1];
        allowOrigins.pop();
    }
}

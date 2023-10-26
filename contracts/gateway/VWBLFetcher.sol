// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./IGatewayProxy.sol";
import "./VWBLGateway.sol";
import "../access-condition/AbstractControlChecker.sol";
import "../access-condition/AbstractVWBLSettings.sol";

contract VWBLFetcher {
    address gatewayProxyAddress;

    constructor(address _gatewayProxy) {
        gatewayProxyAddress = _gatewayProxy;
    }

    function getGatewayAddress() public view returns (address) {
        return IGatewayProxy(gatewayProxyAddress).getGatewayAddress();
    }

    function getSignMsgAddress(bytes32 documentId) public view returns (address) {
        address gatewayAddress = getGatewayAddress();
        VWBLGateway gatewayContract = VWBLGateway(gatewayAddress);
        address checkerAddress = gatewayContract.documentIdToConditionContract(documentId);
        AbstractControlChecker checkerContract = AbstractControlChecker(checkerAddress);
        (address contractAddress, uint256 _tokenId) = checkerContract.documentIdToToken(documentId);
        return contractAddress;
    }

    function getSignMsgAndAllowOrigins(address vwblAddress) public view returns (string memory, string memory) {
        AbstractVWBLSettings vwblContract = AbstractVWBLSettings(vwblAddress);
        string memory signMsg = vwblContract.getSignMessage();
        string memory allowOrigins = vwblContract.getAllowOrigins();
        return (signMsg, allowOrigins);
    }
}

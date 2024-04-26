// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./IGatewayProxy.sol";
import "./IVWBLGatewayV2.sol";
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
        address checkerAddress = IVWBLGatewayV2(gatewayAddress).documentIdToConditionContract(documentId);
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

    function getSignMsgAndAllowOrigins(bytes32 documentId) public view returns (string memory, string memory) {
        address gatewayAddress = getGatewayAddress();
        address checkerAddress = IVWBLGatewayV2(gatewayAddress).documentIdToConditionContract(documentId);
        AbstractControlChecker checkerContract = AbstractControlChecker(checkerAddress);
        (address vwblAddress, uint256 _tokenId) = checkerContract.documentIdToToken(documentId);
        AbstractVWBLSettings vwblContract = AbstractVWBLSettings(vwblAddress);
        string memory signMsg = vwblContract.getSignMessage();
        string memory allowOrigins = vwblContract.getAllowOrigins();
        return (signMsg, allowOrigins);
    }
}

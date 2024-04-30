// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

interface IGatewayProxy {
    function getGatewayAddress() external view returns (address);
}

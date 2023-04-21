// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

interface IVWBLSettings {
    /**
     * @notice Get VWBL Fee
     */
    function getFee() external view returns (uint256);

    /**
     * @notice Get Gateway Address
     */
    function getGatewayAddress() external view returns (address);

    /**
     * @notice Get a message to be signed of this contract
     */
    function getSignMessage() external view returns (string memory);

    /**
     * @notice Set the message to be signed of this contract
     */
    function setSignMessage(string calldata _signMessage) external;

    /**
     * @notice Get Access-Control-Allow-Origin for VWBL Network to return decryption key
     */
    function getAllowOrigins() external view returns (string memory);

    /**
     * @notice Set Access-Control-Allow-Origin for VWBL Network to return decryption key
     */
    function setAllowOrigins(string memory) external;
}

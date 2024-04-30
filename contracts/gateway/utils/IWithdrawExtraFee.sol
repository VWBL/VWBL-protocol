// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

interface IWithdrawExtraFee {
    /**
     * @notice Deposit extra vwbl fee into the contract from specified source address.
     * @param srcAddress The address who call payFee method of VWBLGatewayV2 contract.
     */
    function depositExtraFee(address srcAddress) external payable;

    function setRecipient(address srcAddress, address recipient) external;
}

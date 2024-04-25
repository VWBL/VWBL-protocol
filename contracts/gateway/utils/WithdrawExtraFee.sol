pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./IWithdrawExtraFee.sol";

contract WithdrawExtraFee is Ownable, ReentrancyGuard, IWithdrawExtraFee {
    uint public totalPendingExtraFee;
    mapping (address => uint) public srcAddrToPendingExtraFee;
    mapping (address => address) public srcAddrToRecipient;

    constructor(
        address _initialOwner
    ) Ownable(_initialOwner) {}

    /**
     * @notice Deposit extra vwbl fee into the contract from specified source address.
     * @param srcAddress The address who call payFee method of VWBLGatewayV2 contract.
     */
    function depositExtraFee(address srcAddress) public payable {
        srcAddrToPendingExtraFee[srcAddress] += msg.value;
        totalPendingExtraFee += msg.value;
    }

    function withdrawAllPendingToken(address srcAddress) public nonReentrant {
        require(srcAddress == msg.sender || srcAddrToRecipient[srcAddress] == msg.sender, "msg sender is invalid withdrawer");
        uint pendingAmount = srcAddrToPendingExtraFee[srcAddress];
        require(pendingAmount > 0, "pending extra fee amount is 0");

        address recipient;
        if (srcAddrToRecipient[srcAddress] != address(0)) {
            recipient = srcAddrToRecipient[srcAddress];
        } else {
            recipient = msg.sender;
        }
        srcAddrToPendingExtraFee[srcAddress] = 0;
        totalPendingExtraFee -= pendingAmount;
        payable(recipient).transfer(pendingAmount);
    }

    function withdrawPendingToken(address srcAddress, uint withdrawAmount) public nonReentrant {
        require(srcAddress == msg.sender || srcAddrToRecipient[srcAddress] == msg.sender, "msg sender is invalid withdrawer");
        uint pendingAmount = srcAddrToPendingExtraFee[srcAddress];
        require(withdrawAmount <= pendingAmount, "withdraw amount is insufficent than pending amount");

        address recipient;
        if (srcAddrToRecipient[srcAddress] != address(0)) {
            recipient = srcAddrToRecipient[srcAddress];
        } else {
            recipient = msg.sender;
        }
        srcAddrToPendingExtraFee[srcAddress] -= withdrawAmount;
        totalPendingExtraFee -= withdrawAmount;
        payable(recipient).transfer(withdrawAmount);
    }

    function setRecipient(address srcAddress, address recipient) public onlyOwner {
        srcAddrToRecipient[srcAddress] = recipient;
    }
}

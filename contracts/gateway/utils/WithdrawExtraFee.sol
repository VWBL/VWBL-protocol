pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./IWithdrawExtraFee.sol";

contract WithdrawExtraFee is Ownable, ReentrancyGuard, IWithdrawExtraFee {
    uint public totalPendingExtraFee;
    mapping (address => uint) public srcAddrToPendingExtraFee;
    mapping (address => address) public srcAddrToRecipient;
    address[] public srcAddresses;

    constructor(
        address _initialOwner
    ) Ownable(_initialOwner) {}

    /**
     * @notice Deposit extra vwbl fee into the contract from specified source address.
     * @param srcAddress The address who call payFee method of VWBLGatewayV2 contract.
     */
    function depositExtraFee(address srcAddress) public payable {
        if (srcAddrToPendingExtraFee[srcAddress] == 0) {
            srcAddresses.push(srcAddress);
        }
        srcAddrToPendingExtraFee[srcAddress] += msg.value;
        totalPendingExtraFee += msg.value;
    }

    /**
     * @notice Withdraws all pending extra fees for a specified source address.
     * @param srcAddress The address who call payFee method of VWBLGatewayV2 contract.
     */
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
        rmFromSrcAddresses(srcAddress);
        totalPendingExtraFee -= pendingAmount;
        payable(recipient).transfer(pendingAmount);
    }

    /**
     * @notice Withdraws pending extra fees for a specified source address.
     * @param srcAddress The address who call payFee method of VWBLGatewayV2 contract.
     */
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
        if (srcAddrToPendingExtraFee[srcAddress] == 0) {
            rmFromSrcAddresses(srcAddress);
        }
        totalPendingExtraFee -= withdrawAmount;
        payable(recipient).transfer(withdrawAmount);
    }

    /**
     * @notice Sets the recipient address for a specified source address.
     * @param srcAddress The address who call payFee method of VWBLGatewayV2 contract.
     * @param recipient The address to set as the recipient for the specified source address.
     */
    function setRecipient(address srcAddress, address recipient) public onlyOwner {
        srcAddrToRecipient[srcAddress] = recipient;
    }

    /**
     * @notice Removes a specific source address from the list of source addresses.
     * @param rmSrcAddress The address to be removed from the list of source addresses.
     */
    function rmFromSrcAddresses(address rmSrcAddress) private {
        address[] memory newSrcAddresses = new address[](srcAddresses.length-1);
        uint j = 0;
        for (uint i = 0; i < srcAddresses.length; i++) {
            if (rmSrcAddress != srcAddresses[i]) {
                newSrcAddresses[j] = srcAddresses[i];
            }
        }
        srcAddresses = newSrcAddresses;
    }
}

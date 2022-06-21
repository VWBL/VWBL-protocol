pragma solidity ^0.8.0;

import "../VWBL.sol";
import "./IRentableVWBL.sol";

contract RentableVWBL is VWBL, IRentableVWBL {
    struct RentalInfo {
        address lender;
        uint256 feeWei;
    }
    mapping(uint256 => RentalInfo) public tokenIdToRentalInfo;

    struct BorrowerInfo {
        address borrower;
        uint256 deadlineBlockNumber;
    }
    BorrowerInfo[] public borrowerInfos;
    mapping(uint256 => uint256[]) public tokenIdToBorrowerInfoKeys; 
    
    mapping(uint256 => uint256) public tokenIdToRentalFee;
    uint256[] public onRentalMarketTokenIds;

    mapping(address => uint256) public pendingRoyalties;
    mapping(address => uint256) public pendingWithdrawals;

    uint256 public pendingRentalMarketFee;
    uint256 public rentalMarketFeePercentage = 250; // If fee is 2.5%, rentalMarketFeePercentage=2.5*10^2 (decimal is 2)

    event royaltiesRecord(uint256 tokenId, uint256 royaltiesAmount);
    event rentalMarketFeePercentageChanged(uint256 oldMarketFeePercentage, uint256 newMarketFeePercentage);
    event borrowed(uint256 tokenId, address borrower, uint256 deadline);

    constructor(
        string memory _baseURI, 
        address _gatewayContract
    ) VWBL(_baseURI, _gatewayContract) {}

    function getListedTokenIds() public returns (uint256[] memory) {
        return onRentalMarketTokenIds;
    }

    function listRentalMarket(
        uint256 _tokenId,
        uint256 _rentalFeePerBlockNumber
    ) public returns (uint256) {
        require(ownerOf(_tokenId) == msg.sender, "msg.sender is not nft owner");
        require(tokenIdToRentalInfo[_tokenId].lender == address(0), "nft is already listed on rental market");

        onRentalMarketTokenIds.push(_tokenId);
        tokenIdToRentalInfo[_tokenId].lender = msg.sender;
        tokenIdToRentalInfo[_tokenId].feeWei = _rentalFeePerBlockNumber;

        return _tokenId;
    }

    function borrowVWBLNFT(
        uint256 _tokenId, 
        uint256 _deadlineBlockNumber
    ) public payable {
        require(onRentalMarket(_tokenId), "nft is not listed on rental market");
        address lenderAddress = tokenIdToRentalInfo[_tokenId].lender;
        uint256 rentalFee = tokenIdToRentalInfo[_tokenId].feeWei * (_deadlineBlockNumber - block.number);
        uint256 rentalMarketFee = rentalFee * rentalMarketFeePercentage / INVERSE_BASIS_POINT;
        require(msg.value == rentalFee + rentalMarketFee, "msg.value is insufficient");

        // Record royalties
        rentalFee = _deduceRoyalties(_tokenId, rentalFee, lenderAddress);
        pendingRentalMarketFee += rentalMarketFee;
        pendingWithdrawals[lenderAddress] += rentalFee;

        borrowerInfos.push(BorrowerInfo(
            msg.sender,
            _deadlineBlockNumber
        ));
        uint256 borrowerInfoKey = borrowerInfos.length - 1;
        tokenIdToBorrowerInfoKeys[_tokenId].push(borrowerInfoKey);

        emit borrowed(_tokenId, msg.sender, _deadlineBlockNumber);
    }

    function onRentalByUser(
        uint256 tokenId, 
        address user
    ) external view returns (bool) {
        uint256[] memory borrowerInfoKeys = tokenIdToBorrowerInfoKeys[tokenId];

        for (uint32 i = 0; i < borrowerInfoKeys.length; i++) {
            if (
                borrowerInfos[borrowerInfoKeys[i]].borrower == user
                && borrowerInfos[borrowerInfoKeys[i]].deadlineBlockNumber <= block.number
            ) {
                return true;
            }
        }

        return false;
    }

    function onRentalMarket(uint256 tokenId) public view returns (bool) {
        for (uint32 i = 0; i < onRentalMarketTokenIds.length; i++) {
            if (onRentalMarketTokenIds[i] == tokenId) {
                return true;
            }
        }
        return false;
    }

    function withdrawAll() external {
         uint rentalFeeAmount = pendingWithdrawals[msg.sender];
        bool rentalFeeAmountGtZero = rentalFeeAmount > 0;
        if (rentalFeeAmountGtZero) {
            pendingWithdrawals[msg.sender] = 0;
        }

        uint royaltiesAmount = pendingRoyalties[msg.sender];
        bool royaltiesAmountGtZero = royaltiesAmount > 0;
        if (royaltiesAmountGtZero) {
            pendingRoyalties[msg.sender] = 0;
        }

        if (rentalFeeAmountGtZero || royaltiesAmountGtZero) {
            uint withdrawAmount = rentalFeeAmount + royaltiesAmount;
            payable(msg.sender).transfer(withdrawAmount);
        }
    }

    function availableToWithdraw() public view returns (uint256) {
        return pendingWithdrawals[msg.sender];
    }

    function availableToWithdrawRoyalty() public view returns (uint256) {
        return pendingRoyalties[msg.sender];
    }

    function withdrawRentalMarketFee() public onlyOwner {
        uint amount = pendingRentalMarketFee;
        require (amount != 0);
        // Remember to zero the pending refund before
        // sending to prevent re-entrancy attacks
        pendingRentalMarketFee = 0;
        payable(msg.sender).transfer(amount);
    }

    function setRentalMarketFeePercentage(uint256 newMarketFeePercentage) public onlyOwner {
        require(newMarketFeePercentage != rentalMarketFeePercentage);
        uint oldMarketFeePercentage = rentalMarketFeePercentage;
        rentalMarketFeePercentage = newMarketFeePercentage;
        emit rentalMarketFeePercentageChanged(oldMarketFeePercentage, newMarketFeePercentage);
    }

    function _deduceRoyalties(uint256 _tokenId, uint256 _grossRentalFee, address _lenderAddress) private returns (uint256) {
        // Get amount of royalties to pays and recipient
        (address royaltiesReceiver, uint256 royaltiesAmount) = royaltyInfo(_tokenId, _grossRentalFee);
        uint256 netRentalFee;
        if (_lenderAddress == royaltiesReceiver) {
            netRentalFee = _grossRentalFee;
        } else {
            // Record royalties to righ tholder if not zero
            if (royaltiesAmount > 0) {
                netRentalFee = _grossRentalFee - royaltiesAmount;
                pendingRoyalties[royaltiesReceiver] += royaltiesAmount;
            }
        }
        // Broadcast royalties
        emit royaltiesRecord(_tokenId, royaltiesAmount);
        return netRentalFee;
    }
}
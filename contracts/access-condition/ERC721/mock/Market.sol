// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/interfaces/IERC2981.sol";
import "./ManageSoldEvent.sol";

contract Market is ManageSoldEvent {
    struct Info {
        address sellerAddress;
        uint256 priceWei;
    }

    // bytes4(keccak256("royaltyInfo(uint256,uint256)")) == 0x2a55205a
    bytes4 private constant _INTERFACE_ID_ERC2981 = 0x2a55205a;
    uint256[] private onSaleTokenIds;
    mapping(uint256 => Info) public tokenIdToInfo;
    mapping(uint256 => uint256) public tokenIdToIndex;
    mapping(address => uint256) private pendingWithdrawals;
    mapping(address => uint256) private pendingRoyalties;
    uint256 public marketFeePercentage = 250; // if fee is 2.5%, auctionFeePercentage=2.5*10^2 (decimal is 2)
    uint256 public pendingMarketFee;
    uint256 public constant INVERSE_BASIS_POINT = 10000;

    IERC721 itemContract;
    address public itemContractAddress;

    event royaltiesRecord(uint256 tokenId, uint256 value);
    event marketFeePercentageChanged(uint256 oldPercentage, uint256 newPercentage);

    constructor(address _contractAddress) ManageSoldEvent(_contractAddress) {
        itemContract = ERC721(_contractAddress);
        itemContractAddress = _contractAddress;
    }

    function getListedTokenIds() public view returns (uint256[] memory) {
        return onSaleTokenIds;
    }

    function listOnMarket(uint256 _tokenId, uint256 _price) public {
        require(msg.sender == itemContract.ownerOf(_tokenId), "msg.sender is not nft owner");
        bool approved = itemContract.getApproved(_tokenId) == address(this);
        bool approvedForAll = itemContract.isApprovedForAll(msg.sender, address(this));
        require(approved || approvedForAll, "Token is not approved yet");
        onSaleTokenIds.push(_tokenId);
        uint256 itemIndex = onSaleTokenIds.length - 1;
        tokenIdToIndex[_tokenId] = itemIndex;
        tokenIdToInfo[_tokenId] = Info(msg.sender, _price);
    }

    function buy(uint256 _tokenId) public payable {
        uint256 itemIndex = tokenIdToIndex[_tokenId];
        address sellerAddress = tokenIdToInfo[_tokenId].sellerAddress;
        uint256 saleValue = tokenIdToInfo[_tokenId].priceWei;
        uint256 marketFee = (saleValue * marketFeePercentage) / INVERSE_BASIS_POINT;
        require(msg.value == saleValue + marketFee, "msg.value is insufficient");
        delete onSaleTokenIds[itemIndex];

        // Record royalities if applicable
        if (_checkRoyalties(itemContractAddress)) {
            saleValue = _deduceRoyalties(_tokenId, saleValue, sellerAddress);
        }

        pendingMarketFee += marketFee;

        //check syntax
        pendingWithdrawals[sellerAddress] += saleValue;
        itemContract.transferFrom(sellerAddress, msg.sender, _tokenId);

        emit sold(saleValue, _tokenId, sellerAddress, msg.sender, block.timestamp);
    }

    function withdrawAll() external {
        uint256 saleAmount = pendingWithdrawals[msg.sender];
        bool saleAmountGtZero = saleAmount > 0;
        if (saleAmountGtZero) {
            pendingWithdrawals[msg.sender] = 0;
        }

        uint256 royaltiesAmount = pendingRoyalties[msg.sender];
        bool royaltiesAmountGtZero = royaltiesAmount > 0;
        if (royaltiesAmountGtZero) {
            pendingRoyalties[msg.sender] = 0;
        }

        if (saleAmountGtZero || royaltiesAmountGtZero) {
            uint256 withdrawAmount = saleAmount + royaltiesAmount;
            payable(msg.sender).transfer(withdrawAmount);
        }
    }

    function availableToWithdraw() public view returns (uint256) {
        return pendingWithdrawals[msg.sender];
    }

    function availableToWithdrawRoyalty() public view returns (uint256) {
        return pendingRoyalties[msg.sender];
    }

    function withdrawMarketFee() public onlyOwner {
        uint256 amount = pendingMarketFee;
        require(amount != 0);
        // Remember to zero the pending refund before
        // sending to prevent re-entrancy attacks
        pendingMarketFee = 0;
        payable(msg.sender).transfer(amount);
    }

    function setMarketFeePercentage(uint256 newMarketFeePercentage) public onlyOwner {
        require(newMarketFeePercentage != marketFeePercentage);
        uint256 oldMarketFeePercentage = marketFeePercentage;
        marketFeePercentage = newMarketFeePercentage;
        emit marketFeePercentageChanged(oldMarketFeePercentage, newMarketFeePercentage);
    }

    /// @notice Checks if NFT contract implements the ERC-2981 interface
    /// @param _contract - the address of the NFT contract to query
    /// @return true if ERC-2981 interface is supported, false otherwise
    function _checkRoyalties(address _contract) private view returns (bool) {
        bool success = IERC2981(_contract).supportsInterface(_INTERFACE_ID_ERC2981);
        return success;
    }

    /// @notice Record royalties to the rights owner if applicable
    /// @param tokenId - the NFT assed queried for royalties
    /// @param grossSaleValue - the price at which the asset will be sold
    /// @param sellerAddress - the address who sell nft
    /// @return netSaleAmount - the value that will go to the seller after
    ///         deducting royalties
    function _deduceRoyalties(
        uint256 tokenId,
        uint256 grossSaleValue,
        address sellerAddress
    ) private returns (uint256 netSaleAmount) {
        // Get amount of royalties to pays and recipient
        (address royaltiesReceiver, uint256 royaltiesAmount) = IERC2981(itemContractAddress).royaltyInfo(
            tokenId,
            grossSaleValue
        );
        uint256 netSaleValue;
        if (sellerAddress == royaltiesReceiver) {
            netSaleValue = grossSaleValue;
        } else {
            // Record royalties to righ tholder if not zero
            if (royaltiesAmount > 0) {
                netSaleValue = grossSaleValue - royaltiesAmount;
                pendingRoyalties[royaltiesReceiver] += royaltiesAmount;
            }
        }
        // Broadcast royalties
        emit royaltiesRecord(tokenId, royaltiesAmount);
        return netSaleValue;
    }
}

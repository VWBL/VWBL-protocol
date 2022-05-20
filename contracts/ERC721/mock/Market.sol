pragma solidity ^0.8.0;
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/interfaces/IERC2981.sol";

contract Market is Ownable {
    struct Info {
        address sellerAddress;
        uint256 priceWei;
    }

    // bytes4(keccak256("royaltyInfo(uint256,uint256)")) == 0x2a55205a
    bytes4 private constant _INTERFACE_ID_ERC2981 = 0x2a55205a;
    uint256[] private onSaleTokenIds;
    address[] private whiteListAddresses;
    mapping (uint256 => Info) public tokenIdToInfo;
    mapping (uint256 => uint256) public tokenIdToIndex;
    mapping (address => uint256) private pendingWithdrawals;
    mapping (address => uint256) private pendingRoyalties;
    uint256 public marketFeePercentage = 250; // if fee is 2.5%, auctionFeePercentage=2.5*10^2 (decimal is 2)
    uint256 public pendingMarketFee;
    uint public constant INVERSE_BASIS_POINT = 10000;

    IERC721 itemContract;
    address public itemContractAddress;

    event royaltiesRecord(uint256 tokenId, uint value);
    event marketFeePercentageChanged(uint256 oldPercentage, uint256 newPercentage);
    event sold(uint256 sellPrice, uint256 tokenId, address from, address to, uint256 timestamp);
    event addedWhiteListAddress(address _address);
    event removedWhiteListAddress(address _address);

    modifier onlyWhitelist {
        bool isWhitelist = false;
        for (uint32 i = 0; i < whiteListAddresses.length; i++) {
            if (msg.sender == whiteListAddresses[i]) {
                isWhitelist = true;
            }
        }
        require(isWhitelist, "msg.sender is not white listed address");
        _;
    }

    constructor (address _contractAddress) {
        itemContract = ERC721(_contractAddress);
        itemContractAddress = _contractAddress;
        whiteListAddresses.push(_contractAddress);
    }

    function getListedTokenIds() public view returns(uint256[] memory){
        return onSaleTokenIds;
    }

    function listOnMarket (uint256 _tokenId, uint256 _price) public {
        require(msg.sender == itemContract.ownerOf(_tokenId), "msg.sender is not nft owner");
        bool approved = itemContract.getApproved(_tokenId) == address(this);
        bool approvedForAll = itemContract.isApprovedForAll(msg.sender, address(this));
        require(approved || approvedForAll, "Token is not approved yet");
        onSaleTokenIds.push(_tokenId);
        uint256 itemIndex = onSaleTokenIds.length - 1;
        tokenIdToIndex[_tokenId] = itemIndex;
        tokenIdToInfo[_tokenId] = Info(msg.sender, _price);
    }

    function buy (uint256 _tokenId) public payable {
        uint256 itemIndex = tokenIdToIndex[_tokenId];
        address sellerAddress = tokenIdToInfo[_tokenId].sellerAddress;
        uint256 saleValue = tokenIdToInfo[_tokenId].priceWei;
        uint256 marketFee = saleValue * marketFeePercentage / INVERSE_BASIS_POINT;
        require (msg.value == saleValue + marketFee, "msg.value is insufficient");
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
        uint saleAmount = pendingWithdrawals[msg.sender];
        bool saleAmountGtZero = saleAmount > 0;
        if (saleAmountGtZero) {
            pendingWithdrawals[msg.sender] = 0;
        }

        uint royaltiesAmount = pendingRoyalties[msg.sender];
        bool royaltiesAmountGtZero = royaltiesAmount > 0;
        if (royaltiesAmountGtZero) {
            pendingRoyalties[msg.sender] = 0;
        }

        if (saleAmountGtZero || royaltiesAmountGtZero) {
            uint withdrawAmount = saleAmount + royaltiesAmount;
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
        uint amount = pendingMarketFee;
        require (amount != 0);
        // Remember to zero the pending refund before
        // sending to prevent re-entrancy attacks
        pendingMarketFee = 0;
        payable(msg.sender).transfer(amount);
    }

    function setMarketFeePercentage(uint256 newMarketFeePercentage) public onlyOwner {
        require(newMarketFeePercentage != marketFeePercentage);
        uint oldMarketFeePercentage = marketFeePercentage;
        marketFeePercentage = newMarketFeePercentage;
        emit marketFeePercentageChanged(oldMarketFeePercentage, newMarketFeePercentage);
    }

    function emitSoldEvent(uint256 _sellPrice, uint256 _tokenId, address _from, address _to) external onlyWhitelist {
        emit sold(_sellPrice, _tokenId, _from, _to, block.timestamp);
    }

    function getWhiteListAddresses() public view returns (address[] memory) {
        return whiteListAddresses;
    }

    function addWhiteListAddress(address _address) public onlyOwner {
        whiteListAddresses.push(_address);
        emit addedWhiteListAddress(_address);
    }

    function removeWhiteListAddress(address _address) public onlyOwner {
        uint256 length = whiteListAddresses.length;
        for (uint32 i = 0; i < length; i++) {
            if (_address == whiteListAddresses[i]) {
                whiteListAddresses[i] = whiteListAddresses[length-1];
                delete whiteListAddresses[length-1];
                emit removedWhiteListAddress(_address);
            }
        }
    }

    /// @notice Checks if NFT contract implements the ERC-2981 interface
    /// @param _contract - the address of the NFT contract to query
    /// @return true if ERC-2981 interface is supported, false otherwise
    function _checkRoyalties(address _contract) private view returns (bool) {
        (bool success) = IERC2981(_contract).supportsInterface(_INTERFACE_ID_ERC2981);
        return success;
    }

    /// @notice Record royalties to the rights owner if applicable
    /// @param tokenId - the NFT assed queried for royalties
    /// @param grossSaleValue - the price at which the asset will be sold
    /// @param sellerAddress - the address who sell nft
    /// @return netSaleAmount - the value that will go to the seller after
    ///         deducting royalties
    function _deduceRoyalties(uint256 tokenId, uint256 grossSaleValue, address sellerAddress) private returns (uint256 netSaleAmount) {
        // Get amount of royalties to pays and recipient
        (address royaltiesReceiver, uint256 royaltiesAmount) = IERC2981(itemContractAddress).royaltyInfo(tokenId, grossSaleValue);
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

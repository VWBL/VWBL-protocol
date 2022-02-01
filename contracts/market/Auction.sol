pragma solidity ^0.8.0;
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract Auction is Ownable {
    struct Info {
        address sellerAddress;
        address bidderAddress;
        uint256 priceWei;
        uint256 lowestBidPrice;
        uint256 deadlineTimestamp;
    }
    uint256[] onSaleTokenIds;
    mapping (uint256 => Info) tokenIdToInfo;
    mapping (uint256 => uint256) tokenIdToIndex;
    mapping (address => uint256) pendingWithdrawals;
    IERC721 itemContract;
    event Bid( address indexed from, uint id, uint256 _bidPriceWei);
    constructor (address _contractAddress) {
        itemContract = ERC721(_contractAddress);
    }

    function listOnAuction (uint256 _tokenId, uint256 _lowestBidPrice, uint256 _deadline) public {
        onSaleTokenIds.push(_tokenId);
        uint256 itemIndex = onSaleTokenIds.length - 1;
        tokenIdToIndex[_tokenId] = itemIndex;
        tokenIdToInfo[_tokenId] = Info(msg.sender, msg.sender, _lowestBidPrice, _lowestBidPrice, _deadline);
    }

    function bid (uint256 _tokenId, uint256 _bidPriceWei) public payable {
        uint256 itemIndex = tokenIdToIndex[_tokenId];
        address sellerAddress = tokenIdToInfo[_tokenId].sellerAddress;
        uint256 price = tokenIdToInfo[_tokenId].priceWei;
        require (msg.value == price);
        delete onSaleTokenIds[itemIndex];
        pendingWithdrawals[sellerAddress] += price;
        itemContract.transferFrom(sellerAddress, msg.sender, _tokenId);
    }

    function finish (uint256 _tokenId) public{

    }

    function withdraw () public {
        uint amount = pendingWithdrawals[msg.sender];
        require (amount != 0);
        // Remember to zero the pending refund before
        // sending to prevent re-entrancy attacks
        pendingWithdrawals[msg.sender] = 0;
        payable(msg.sender).transfer(amount);
    }
}

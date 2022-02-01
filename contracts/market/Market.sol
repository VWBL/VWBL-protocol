pragma solidity ^0.8.0;
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract Market is Ownable {
    struct Info {
        address sellerAddress;
        uint256 priceWei;
    }
    uint256[] public onSaleTokenIds;
    mapping (uint256 => Info) tokenIdToInfo;
    mapping (uint256 => uint256) tokenIdToIndex;
    mapping (address => uint256) pendingWithdrawals;
    IERC721 itemContract;
    constructor (address _contractAddress) {
        itemContract = ERC721(_contractAddress);
    }

    function listOnMarket (uint256 _tokenId, uint256 _price) public {
        onSaleTokenIds.push(_tokenId);
        uint256 itemIndex = onSaleTokenIds.length - 1;
        tokenIdToIndex[_tokenId] = itemIndex;
        tokenIdToInfo[_tokenId] = Info(msg.sender, _price);
    }

    function buy (uint256 _tokenId) public payable {
        uint256 itemIndex = tokenIdToIndex[_tokenId];
        address sellerAddress = tokenIdToInfo[_tokenId].sellerAddress;
        uint256 price = tokenIdToInfo[_tokenId].priceWei;
        require (msg.value == price);
        delete onSaleTokenIds[itemIndex];
        pendingWithdrawals[sellerAddress] += price;
        itemContract.transferFrom(sellerAddress, msg.sender, _tokenId);
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

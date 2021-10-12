pragma solidity ^0.8.0;
import "https://github.com/OpenZeppelin/openzeppelin-contracts/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "https://github.com/OpenZeppelin/openzeppelin-contracts/contracts/access/Ownable.sol";


abstract contract VWBLProtocol is ERC721Enumerable {
    uint256 public counter = 0;
    // minterAddressはマーケットコントラクトとかからも使うのでコントラクトコントラクトで持つのが必須必須だが、KeyやURLはMetaDataで持ってもいいかも、ガス代削減
    struct TokenInfo {
     string encryptedDecryptKey;
     address minterAddress;
     string decrypterURl;
    }
    
    mapping(uint256 => TokenInfo) public tokenIdToTokenInfo;
    
    function transfer(address to, uint256 tokenId) public {
        _transfer(msg.sender, to, tokenId);
    }
    
    function safeTransfer(address to, uint256 tokenId) public{
        _safeTransfer(msg.sender, to, tokenId, "");
    }

    
    function mint(string memory _encryptedDecryptKey, string memory _decrypterURl) public returns (uint256) {
        uint256 tokenId = ++counter;
        tokenIdToTokenInfo[tokenId].encryptedDecryptKey = _encryptedDecryptKey;
        tokenIdToTokenInfo[tokenId].minterAddress = msg.sender;
        tokenIdToTokenInfo[tokenId].decrypterURl = _decrypterURl;
        _mint(msg.sender, tokenId);
        return tokenId;
    }
}

contract VWBL is VWBLProtocol, Ownable{
    string public baseURI;
    constructor(string memory _baseURI) public ERC721("VWBL", "VWBL") {
        baseURI = _baseURI;
    }
    
    function _baseURI() internal view override returns (string memory) {
        return baseURI;
    }
    
    function setBaseURI(string memory _baseURI) public onlyOwner {
        baseURI = _baseURI;
    }
}

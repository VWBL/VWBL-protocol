pragma solidity ^0.8.0;
import "https://github.com/OpenZeppelin/openzeppelin-contracts/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "https://github.com/OpenZeppelin/openzeppelin-contracts/contracts/access/Ownable.sol";

/**
 * @dev Implementation of https://eips.ethereum.org/EIPS/eip-721[ERC721] Non-Fungible Token Standard, including
 * the Metadata extension, but not including the Enumerable extension, which is available separately as
 * {ERC721Enumerable}.
 */
abstract contract VWBLProtocol is ERC721Enumerable {
    uint256 public counter = 0;
    
    mapping(uint256 => string) private encryptedDecryptKeys;
    
    function transfer(address to, uint256 tokenId) public {
        _transfer(msg.sender, to, tokenId);
    }
    
    function safeTransfer(address to, uint256 tokenId) public{
        _safeTransfer(msg.sender, to, tokenId, "");
    }

    
    function mint(string memory _encryptedDecryptKey) public returns (uint256) {
        uint256 tokenId = ++counter;
        encryptedDecryptKeys[tokenId] = _encryptedDecryptKey;
        _mint(msg.sender, tokenId);
        return tokenId;
    }
    
    function getEncryptedDecryptKey(uint256 tokenId) public view returns(string memory) {
        require(ERC721.ownerOf(tokenId) == msg.sender, "ERC721: cannot see key of token that is not own");
        return encryptedDecryptKeys[tokenId];
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

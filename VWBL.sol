pragma solidity ^0.8.0;
import "https://github.com/OpenZeppelin/openzeppelin-contracts/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "https://github.com/OpenZeppelin/openzeppelin-contracts/contracts/access/Ownable.sol";

abstract contract VWBLProtocol is ERC721Enumerable {
    uint256 public counter = 0;
    struct TokenInfo {
        address minterAddress;
        string getKeyURl;
    }

    mapping(uint256 => TokenInfo) public tokenIdToTokenInfo;

    function transfer(address to, uint256 tokenId) public {
        _transfer(msg.sender, to, tokenId);
    }

    function safeTransfer(address to, uint256 tokenId) public {
        _safeTransfer(msg.sender, to, tokenId, "");
    }

    function mint(string memory _getKeyURl) public virtual returns (uint256) {
        uint256 tokenId = ++counter;
        tokenIdToTokenInfo[tokenId].minterAddress = msg.sender;
        tokenIdToTokenInfo[tokenId].getKeyURl = _getKeyURl;
        _mint(msg.sender, tokenId);
        return tokenId;
    }

    function getTokenByMinter(address minter)
        public
        view
        returns (TokenInfo[] memory)
    {
        uint256 currentCounter = 0;
        TokenInfo[] memory tokens = new TokenInfo[](counter);
        for (uint256 i = 1; i <= counter; i++) {
            if (tokenIdToTokenInfo[i].minterAddress == minter) {
                tokens[currentCounter] = tokenIdToTokenInfo[i];
            }
        }
        return tokens;
    }
}

contract VWBL is VWBLProtocol, Ownable {
    string public baseURI;

    constructor(string memory _baseURI) ERC721("VWBL", "VWBL") {
        baseURI = _baseURI;
    }

    function _baseURI() internal view override returns (string memory) {
        return baseURI;
    }

    function setBaseURI(string memory _baseURI) public onlyOwner {
        baseURI = _baseURI;
    }
}
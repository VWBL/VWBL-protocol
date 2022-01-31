pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/interfaces/IERC2981.sol";
import "@openzeppelin/contracts/utils/introspection/IERC165.sol";

abstract contract VWBLProtocol is ERC721Enumerable, IERC2981 {
    uint256 public counter = 0;
    struct TokenInfo {
        address minterAddress;
        string getKeyURl;
    }

    struct RoyaltyInfo {
        address recipient;
        uint256 royaltiesPercentage;
    }

    mapping(uint256 => TokenInfo) public tokenIdToTokenInfo;
    mapping(uint256 => RoyaltyInfo) public tokenIdToRoyaltyInfo;

    function transfer(address to, uint256 tokenId) public {
        _transfer(msg.sender, to, tokenId);
    }

    function safeTransfer(address to, uint256 tokenId) public {
        _safeTransfer(msg.sender, to, tokenId, "");
    }

    function mint(address _minter, string memory _getKeyURl, uint256 _royaltiesPercentage) public virtual returns (uint256) {
        uint256 tokenId = ++counter;
        tokenIdToTokenInfo[tokenId].minterAddress = _minter;
        tokenIdToTokenInfo[tokenId].getKeyURl = _getKeyURl;
        _mint(_minter, tokenId);
        if (_royaltiesPercentage > 0) {
            _setRoyalty(tokenId, _minter, _royaltiesPercentage);
        }
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

    function supportsInterface(bytes4 interfaceId) public view
        virtual override(IERC165, ERC721Enumerable) returns (bool) {
            return interfaceId == type(IERC2981).interfaceId ||
            super.supportsInterface(interfaceId);
    }

    function royaltyInfo(uint256 _tokenId, uint256 _salePrice)
        external
        view
        override
        returns (address receiver, uint256 royaltyAmount)
    {
        RoyaltyInfo memory royaltyInfo = tokenIdToRoyaltyInfo[_tokenId];
        uint256 _royalties = (_salePrice * royaltyInfo.royaltiesPercentage) / 100;
        return (royaltyInfo.recipient, _royalties);
    }

    function _setRoyalty(
        uint256 _tokenId,
        address _recipient,
        uint256 _royaltiesPercentage
    ) internal {
        RoyaltyInfo storage royaltyInfo = tokenIdToRoyaltyInfo[_tokenId];
        royaltyInfo.recipient = _recipient;
        royaltyInfo.royaltiesPercentage = _royaltiesPercentage;
    }
}

contract VWBL is VWBLProtocol, Ownable {
    string public baseURI;

    constructor(
        string memory _baseURI
    ) ERC721("VWBL", "VWBL") {
        baseURI = _baseURI;
    }

    function _baseURI() internal view override returns (string memory) {
        return baseURI;
    }

    function setBaseURI(string memory _baseURI) public onlyOwner {
        baseURI = _baseURI;
    }
}

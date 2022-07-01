// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./ERC1155Enumerable.sol";
import "./dependencies/IERC2981.sol";
import "./dependencies/IERC165.sol";
import "./dependencies/Ownable.sol";

contract VWBLERC1155 is IERC2981, Ownable, ERC1155Enumerable {
    uint256 public counter = 0;
    
    struct TokenInfo {
        address minterAddress;
        string getKeyURl;
    }

    struct RoyaltyInfo {
        address recipient;
        uint256 royaltiesPercentage; // if percentage is 3.5, royaltiesPercentage=3.5*10^2 (decimal is 2)
    }

    mapping(uint256 => TokenInfo) public tokenIdToTokenInfo;
    mapping(uint256 => RoyaltyInfo) public tokenIdToRoyaltyInfo;

    uint public constant INVERSE_BASIS_POINT = 10000;

    constructor(string memory _baseURI) ERC1155(_baseURI) {}

    function setBaseURI(string memory _baseURI) public onlyOwner {
        _setURI(_baseURI);
    }

    function mint(string memory _getKeyURl, uint256 amount, uint256 _royaltiesPercentage) public returns (uint256) {
        uint256 tokenId = ++counter;
        tokenIdToTokenInfo[tokenId].minterAddress = msg.sender;
        tokenIdToTokenInfo[tokenId].getKeyURl = _getKeyURl;
        _mint(msg.sender, tokenId, amount, "");
        if (_royaltiesPercentage > 0) {
            _setRoyalty(tokenId, msg.sender, _royaltiesPercentage);
        }
        return tokenId;
    }

    function mintBatch(
        string[] memory _getKeyUrls, 
        uint256[] memory amounts, 
        uint256[] memory _royaltiesPercentages
    ) public {
        require(
            _getKeyUrls.length == amounts.length
            && amounts.length == _royaltiesPercentages.length, 
            "Invalid array length"
        );

        uint256[] memory tokenIds = new uint256[](_getKeyUrls.length);
        for (uint32 i = 0; i < _getKeyUrls.length; i++) {
            uint256 tokenId = ++counter;
            tokenIds[i] = tokenId;
            tokenIdToTokenInfo[tokenId].minterAddress = msg.sender;
            tokenIdToTokenInfo[tokenId].getKeyURl = _getKeyUrls[i];
            if (_royaltiesPercentages[i] > 0) {
                _setRoyalty(tokenId, msg.sender, _royaltiesPercentages[i]);
            } 
        }

        _mintBatch(msg.sender, tokenIds, amounts, "");
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
                tokens[currentCounter++] = tokenIdToTokenInfo[i];
            }
        }
        return tokens;
    }

    function supportsInterface(bytes4 interfaceId) public view 
        virtual override(IERC165, ERC1155) returns (bool) {
        return interfaceId == type(IERC2981).interfaceId
            || super.supportsInterface(interfaceId);
    }

    function royaltyInfo(uint256 _tokenId, uint256 _salePrice)
        external
        view
        override
        returns (address receiver, uint256 royaltyAmount)
    {
        RoyaltyInfo memory royaltyInfo = tokenIdToRoyaltyInfo[_tokenId];
        uint256 _royalties = (_salePrice * royaltyInfo.royaltiesPercentage) / INVERSE_BASIS_POINT;
        return (royaltyInfo.recipient, _royalties);
    }

    function _setRoyalty(
        uint256 _tokenId,
        address _recipient,
        uint256 _royaltiesPercentage
    ) private {
        RoyaltyInfo storage royaltyInfo = tokenIdToRoyaltyInfo[_tokenId];
        royaltyInfo.recipient = _recipient;
        royaltyInfo.royaltiesPercentage = _royaltiesPercentage;
    }
}
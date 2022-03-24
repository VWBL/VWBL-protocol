pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/interfaces/IERC2981.sol";
import "@openzeppelin/contracts/utils/introspection/IERC165.sol";

import "./mock/VWBLGateway.sol";

abstract contract VWBLProtocol is ERC721Enumerable, IERC2981 {
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

    uint256 public constant INVERSE_BASIS_POINT = 10000;

    function mint(string memory _getKeyURl, uint256 _royaltiesPercentage) public returns (uint256) {
        uint256 tokenId = ++counter;
        tokenIdToTokenInfo[tokenId].minterAddress = msg.sender;
        tokenIdToTokenInfo[tokenId].getKeyURl = _getKeyURl;
        _mint(msg.sender, tokenId);
        if (_royaltiesPercentage > 0) {
            _setRoyalty(tokenId, msg.sender, _royaltiesPercentage);
        }
        return tokenId;
    }

    function getTokenByMinter(address minter) public view returns (TokenInfo[] memory) {
        uint256 currentCounter = 0;
        TokenInfo[] memory tokens = new TokenInfo[](counter);
        for (uint256 i = 1; i <= counter; i++) {
            if (tokenIdToTokenInfo[i].minterAddress == minter) {
                tokens[currentCounter++] = tokenIdToTokenInfo[i];
            }
        }
        return tokens;
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        virtual
        override(IERC165, ERC721Enumerable)
        returns (bool)
    {
        return interfaceId == type(IERC2981).interfaceId || super.supportsInterface(interfaceId);
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
    ) internal {
        RoyaltyInfo storage royaltyInfo = tokenIdToRoyaltyInfo[_tokenId];
        royaltyInfo.recipient = _recipient;
        royaltyInfo.royaltiesPercentage = _royaltiesPercentage;
    }
}

contract VWBL is VWBLProtocol, Ownable {
    string public baseURI;
    address public gatewayContract;

    event gatewayContractChanged(address oldGatewayContract, address newGatewayContract);

    constructor(string memory _baseURI, address _gatewayContract) ERC721("VWBL", "VWBL") {
        baseURI = _baseURI;
        gatewayContract = _gatewayContract;
    }

    function _baseURI() internal view override returns (string memory) {
        return baseURI;
    }

    function setBaseURI(string memory _baseURI) public onlyOwner {
        baseURI = _baseURI;
    }

    function setGatewayContract(address newGatewayContract) public onlyOwner {
        require(newGatewayContract != gatewayContract);
        address oldGatewayContract = gatewayContract;
        gatewayContract = newGatewayContract;

        emit gatewayContractChanged(oldGatewayContract, newGatewayContract);
    }

    function mint(string memory _getKeyURl, uint256 _royaltiesPercentage, bytes32 documentId) public returns (uint256) {
        uint256 tokenId = super.mint(_getKeyURl, _royaltiesPercentage);

        VWBLGateway(gatewayContract).grantAccessControl(documentId, address(this), tokenId);

        return tokenId;
    }
}

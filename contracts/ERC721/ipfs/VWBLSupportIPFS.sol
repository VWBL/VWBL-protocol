// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/interfaces/IERC2981.sol";
import "@openzeppelin/contracts/utils/introspection/IERC165.sol";

import "./IVWBLSupportIPFS.sol";
import "../../access-condition/IAccessControlCheckerByNFT.sol";
import "../../gateway/IVWBLGateway.sol";

abstract contract VWBLProtocol is ERC721Enumerable, IERC2981 {
    mapping(uint256 => string) private _tokenURIs;
    
    uint256 public counter = 0;
    
    struct TokenInfo {
        bytes32 documentId;
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

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        require(
            bytes(_tokenURIs[tokenId]).length != 0,
            "ERC721: invalid token ID"
        );
        return _tokenURIs[tokenId];
    }

    function _mint(
        bytes32 _documentId, 
        string memory _metadataURl,
        string memory _getKeyURl, 
        uint256 _royaltiesPercentage
    ) internal returns (uint256) {
        uint256 tokenId = ++counter;
        TokenInfo memory tokenInfo = TokenInfo(_documentId, msg.sender, _getKeyURl);
        tokenIdToTokenInfo[tokenId] = tokenInfo;
        _mint(msg.sender, tokenId);
        _tokenURIs[tokenId] = _metadataURl;
        if (_royaltiesPercentage > 0) {
            _setRoyalty(tokenId, msg.sender, _royaltiesPercentage);
        }
        return tokenId;
    }

    function getTokenByMinter(address minter)
        public
        view
        returns (uint256[] memory)
    {
        uint256 resultCount = 0;
        for (uint256 i = 1; i <= counter; i++) {
            if (tokenIdToTokenInfo[i].minterAddress == minter) {
                resultCount++;
            }
        }
        uint256[] memory tokens = new uint256[](resultCount);
        uint256 currentCounter = 0;
        for (uint256 i = 1; i <= counter; i++) {
            if (tokenIdToTokenInfo[i].minterAddress == minter) {
                tokens[currentCounter++] = i;
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

contract VWBLSupportIPFS is VWBLProtocol, Ownable, IVWBLSupportIPFS {
    address public gatewayContract;
    address public accessCheckerContract;

    event gatewayContractChanged(address oldGatewayContract, address newGatewayContract);
    event accessCheckerContractChanged(address oldAccessCheckerContract, address newAccessCheckerContract);

    constructor(
        address _gatewayContract, 
        address _accessCheckerContract
    ) ERC721("VWBL", "VWBL") {
        gatewayContract = _gatewayContract;
        accessCheckerContract = _accessCheckerContract;
    }

    function setGatewayContract(address newGatewayContract) public onlyOwner {
        require(newGatewayContract != gatewayContract);
        address oldGatewayContract = gatewayContract;
        gatewayContract = newGatewayContract;

        emit gatewayContractChanged(oldGatewayContract, newGatewayContract);
    }

    function setAccessCheckerContract(address newAccessCheckerContract) public onlyOwner {
        require(newAccessCheckerContract != accessCheckerContract);
        address oldAccessCheckerContract = accessCheckerContract;
        accessCheckerContract = newAccessCheckerContract;

        emit accessCheckerContractChanged(oldAccessCheckerContract, newAccessCheckerContract);
    }

    function getFee() public view returns (uint256) {
        return IVWBLGateway(gatewayContract).feeWei();
    }

    function mint(
        string memory _metadataURl,
        string memory _getKeyURl, 
        uint256 _royaltiesPercentage, 
        bytes32 _documentId
    ) public payable returns (uint256) {
        uint256 tokenId = super._mint(_documentId, _metadataURl, _getKeyURl, _royaltiesPercentage);

        // grant access control to nft and pay vwbl fee and register nft data to access control checker contract
        IAccessControlCheckerByNFT(accessCheckerContract).grantAccessControlAndRegisterNFT{value: msg.value}(_documentId, address(this), tokenId);

        return tokenId;
    }

    function getMinter(uint256 tokenId) public view returns (address) {
        return tokenIdToTokenInfo[tokenId].minterAddress;
    }
}
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/interfaces/IERC2981.sol";
import "@openzeppelin/contracts/utils/introspection/IERC165.sol";

import "./IVWBLMetadata.sol";
import "../IAccessControlCheckerByNFT.sol";
import "../../AbstractVWBLSettings.sol";

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
        require(bytes(_tokenURIs[tokenId]).length != 0, "ERC721: invalid token ID");
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

    /**
     * @notice Get token Info for each minter
     * @param minter The address of NFT Minter
     */
    function getTokenByMinter(address minter) public view returns (uint256[] memory) {
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

    /**
     * @notice Called with the sale price to determine how much royalty is owned and to whom,
     * @param _tokenId The NFT asset queried for royalty information
     * @param _salePrice The sale price of the NFT asset specified by _tokenId
     * @return receiver Address of who should be sent the royalty payment
     * @return royaltyAmount The royalty payment amount for _salePrice
     */
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

/**
 * @dev NFT which is added Viewable features that only NFT Owner can view digital content
 *      Unlike the VWBL.sol, the metadata url is stored when mint.
 */
contract VWBLMetadata is VWBLProtocol, Ownable, IVWBLMetadata, AbstractVWBLSettings {
    address public accessCheckerContract;
    string private signMessage;

    event accessCheckerContractChanged(address oldAccessCheckerContract, address newAccessCheckerContract);

    constructor(
        address _gatewayProxy,
        address _accessCheckerContract,
        string memory _signMessage
    ) ERC721("VWBL", "VWBL") AbstractVWBLSettings(_gatewayProxy, _signMessage) {
        accessCheckerContract = _accessCheckerContract;
    }

    /**
     * @notice Set new access condition contract address
     * @param newAccessCheckerContract The contract address of new access condition contract
     */
    function setAccessCheckerContract(address newAccessCheckerContract) public onlyOwner {
        require(newAccessCheckerContract != accessCheckerContract);
        address oldAccessCheckerContract = accessCheckerContract;
        accessCheckerContract = newAccessCheckerContract;

        emit accessCheckerContractChanged(oldAccessCheckerContract, newAccessCheckerContract);
    }

    /**
     * @notice Mint NFT, grant access feature and register access condition of digital content.
     * @param _metadataURl The URl of nft metadata
     * @param _getKeyURl The URl of VWBL Network(Key management network)
     * @param _royaltiesPercentage Royalty percentage of NFT
     * @param _documentId The Identifier of digital content and decryption key
     */
    function mint(
        string memory _metadataURl,
        string memory _getKeyURl,
        uint256 _royaltiesPercentage,
        bytes32 _documentId
    ) public payable returns (uint256) {
        uint256 tokenId = super._mint(_documentId, _metadataURl, _getKeyURl, _royaltiesPercentage);

        // grant access control to nft and pay vwbl fee and register nft data to access control checker contract
        IAccessControlCheckerByNFT(accessCheckerContract).grantAccessControlAndRegisterNFT{value: msg.value}(
            _documentId,
            address(this),
            tokenId
        );

        return tokenId;
    }

    /**
     * @notice Get minter of NFT by tokenId
     * @param tokenId The Identifier of NFT
     */
    function getMinter(uint256 tokenId) public view returns (address) {
        return tokenIdToTokenInfo[tokenId].minterAddress;
    }
}

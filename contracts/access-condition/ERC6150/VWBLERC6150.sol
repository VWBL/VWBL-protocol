// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/interfaces/IERC2981.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "../AbstractVWBLSettings.sol";
import "./IVWBLERC6150.sol";
import "./ERC6150ParentTransferable.sol";
import "../ERC721/IAccessControlCheckerByNFT.sol";

/**
 * @dev ERC6150 which is added Viewable features that only ERC6150 Owner can view digital content
 */
contract VWBLERC6150 is Ownable, IVWBLERC6150, ERC6150ParentTransferable, AbstractVWBLSettings {
    using SafeMath for uint256;
    using Strings for uint256;

    address public accessCheckerContract;
    string baseURI;

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

    event accessCheckerContractChanged(address oldAccessCheckerContract, address newAccessCheckerContract);

    constructor(
        string memory _baseURI,
        address _gatewayProxy,
        address _accessCheckerContract,
        string memory _signMessage
    ) ERC6150("VWBL", "VWBL") AbstractVWBLSettings(_gatewayProxy, _signMessage) {
        setBaseURI(baseURI);
        accessCheckerContract = _accessCheckerContract;
    }

    /**
     * @notice Set BaseURI.
     * @param newBaseURI new BaseURI
     */
    function setBaseURI(string memory newBaseURI) public onlyOwner {
        baseURI = newBaseURI;
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
     * @notice Get minter of ERC6150 by tokenId
     * @param tokenId The Identifier of ERC6150
     */
    function getMinter(uint256 tokenId) public view returns (address) {
        return tokenIdToTokenInfo[tokenId].minterAddress;
    }

    /**
     * @notice Mint ERC6150, grant access feature and register access condition of digital content.
     * @param _getKeyURl The URl of VWBL Network(Key management network)
     * @param _parentId parent token Id
     * @param _royaltiesPercentage Royalty percentage of ERC6150
     * @param _documentId The Identifier of digital content and decryption key
     */
    function mint(
        string memory _getKeyURl,
        uint256 _parentId,
        uint256 _royaltiesPercentage,
        bytes32 _documentId
    ) public payable returns (uint256) {
        uint256 tokenId = ++counter;
        tokenIdToTokenInfo[tokenId].documentId = _documentId;
        tokenIdToTokenInfo[tokenId].minterAddress = msg.sender;
        tokenIdToTokenInfo[tokenId].getKeyURl = _getKeyURl;
        _safeMintWithParent(msg.sender, _parentId, tokenId);
        if (_royaltiesPercentage > 0) {
            _setRoyalty(tokenId, msg.sender, _royaltiesPercentage);
        }

        IAccessControlCheckerByNFT(accessCheckerContract).grantAccessControlAndRegisterNFT{value: msg.value}(
            _documentId,
            address(this),
            tokenId
        );

        return tokenId;
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
    ) private {
        RoyaltyInfo storage royaltyInfo = tokenIdToRoyaltyInfo[_tokenId];
        royaltyInfo.recipient = _recipient;
        royaltyInfo.royaltiesPercentage = _royaltiesPercentage;
    }

    /**
     * @notice Get token Info for each minter
     * @param minter The address of ERC1155 Minter
     */
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

    function supportsInterface(bytes4 interfaceId) public view virtual override(IERC165, ERC6150) returns (bool) {
        return interfaceId == type(IERC2981).interfaceId || super.supportsInterface(interfaceId);
    }
}

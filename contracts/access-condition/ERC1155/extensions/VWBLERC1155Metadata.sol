// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "../ERC1155Enumerable.sol";
import "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155Burnable.sol";
import "@openzeppelin/contracts/interfaces/IERC2981.sol";
import "@openzeppelin/contracts/interfaces/IERC165.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "../IAccessControlCheckerByERC1155.sol";
import "../../../gateway/IGatewayProxy.sol";
import "../../../gateway/IVWBLGateway.sol";
import "../../AbstractVWBLSettings.sol";

/**
 * @dev Erc1155 which is added Viewable features that only ERC1155 Owner can view digital content
 */
contract VWBLERC1155Metadata is IERC2981, Ownable, ERC1155Enumerable, ERC1155Burnable, AbstractVWBLSettings {
    using SafeMath for uint256;

    address public accessCheckerContract;

    uint256 public counter = 0;

    struct TokenInfo {
        address minterAddress;
        bytes32 documentId;
        string getKeyURl;
    }

    struct RoyaltyInfo {
        address recipient;
        uint256 royaltiesPercentage; // if percentage is 3.5, royaltiesPercentage=3.5*10^2 (decimal is 2)
    }

    mapping(uint256 => string) private _tokenURIs;
    mapping(uint256 => TokenInfo) public tokenIdToTokenInfo;
    mapping(uint256 => RoyaltyInfo) public tokenIdToRoyaltyInfo;

    uint256 public constant INVERSE_BASIS_POINT = 10000;

    event accessCheckerContractChanged(address oldAccessCheckerContract, address newAccessCheckerContract);

    constructor(
        address _gatewayProxy,
        address _accessCheckerContract,
        string memory _signMessage
    ) ERC1155("") AbstractVWBLSettings(_gatewayProxy, _signMessage) {
        gatewayProxy = _gatewayProxy;
        accessCheckerContract = _accessCheckerContract;
    }

    function _beforeTokenTransfer(
        address operator,
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory amounts,
        bytes memory data
    ) internal override(ERC1155, ERC1155Enumerable) {
        super._beforeTokenTransfer(operator, from, to, ids, amounts, data);
    }

    function uri(uint256 tokenId) public view override returns (string memory) {
        require(bytes(_tokenURIs[tokenId]).length != 0, "ERC1155: invalid token ID");
        return _tokenURIs[tokenId];
    }

    function _mint(
        string memory _metadataURl,
        string memory _getKeyURl,
        uint256 _amount,
        uint256 _royaltiesPercentage,
        bytes32 _documentId
    ) internal returns (uint256) {
        uint256 tokenId = ++counter;
        tokenIdToTokenInfo[tokenId].minterAddress = msg.sender;
        tokenIdToTokenInfo[tokenId].documentId = _documentId;
        tokenIdToTokenInfo[tokenId].getKeyURl = _getKeyURl;
        super._mint(msg.sender, tokenId, _amount, "");
        _tokenURIs[tokenId] = _metadataURl;
        if (_royaltiesPercentage > 0) {
            _setRoyalty(tokenId, msg.sender, _royaltiesPercentage);
        }
        return tokenId;
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
     * @notice Get minter of ERC1155 by tokenId
     * @param tokenId The Identifier of ERC1155
     */
    function getMinter(uint256 tokenId) public view returns (address) {
        return tokenIdToTokenInfo[tokenId].minterAddress;
    }

    /**
     * @notice Mint ERC1155, grant access feature and register access condition of digital content.
     * @param _metadataURl The URl of nft metadata
     * @param _getKeyURl The URl of VWBL Network(Key management network)
     * @param _amount The token quantity
     * @param _royaltiesPercentage Royalty percentage of ERC1155
     * @param _documentId The Identifier of digital content and decryption key
     */
    function mint(
        string memory _metadataURl,
        string memory _getKeyURl,
        uint256 _amount,
        uint256 _royaltiesPercentage,
        bytes32 _documentId
    ) public payable returns (uint256) {
        uint256 tokenId = _mint(_metadataURl, _getKeyURl, _amount, _royaltiesPercentage, _documentId);

        IAccessControlCheckerByERC1155(accessCheckerContract).grantAccessControlAndRegisterERC1155{value: msg.value}(
            _documentId,
            address(this),
            tokenId
        );

        return tokenId;
    }

    /**
     * @notice Batch mint ERC1155, grant access feature and register access condition of digital content.
     * @param _metadataURl The URl of nft metadata
     * @param _getKeyURl The Url of VWBL Network(Key management network)
     * @param _amounts The array of token quantity
     * @param _royaltiesPercentages Array of Royalty percentage of ERC1155
     * @param _documentIds The array of Identifier of digital content and decryption key
     */
    function mintBatch(
        string memory _metadataURl,
        string memory _getKeyURl,
        uint256[] memory _amounts,
        uint256[] memory _royaltiesPercentages,
        bytes32[] memory _documentIds
    ) public payable returns (uint256[] memory) {
        require(
            _amounts.length == _royaltiesPercentages.length && _royaltiesPercentages.length == _documentIds.length,
            "Invalid array length"
        );

        uint256[] memory tokenIds = new uint256[](_amounts.length);
        for (uint32 i = 0; i < _amounts.length; i++) {
            uint256 tokenId = ++counter;
            tokenIds[i] = tokenId;
            tokenIdToTokenInfo[tokenId].documentId = _documentIds[i];
            tokenIdToTokenInfo[tokenId].minterAddress = msg.sender;
            tokenIdToTokenInfo[tokenId].getKeyURl = _getKeyURl;
            _tokenURIs[tokenId] = _metadataURl;
            if (_royaltiesPercentages[i] > 0) {
                _setRoyalty(tokenId, msg.sender, _royaltiesPercentages[i]);
            }
        }

        _mintBatch(msg.sender, tokenIds, _amounts, "");

        (bool calResult, uint256 fee) = msg.value.tryDiv(_amounts.length);
        require(calResult, "Calculation error of div");
        for (uint32 i = 0; i < _amounts.length; i++) {
            IAccessControlCheckerByERC1155(accessCheckerContract).grantAccessControlAndRegisterERC1155{value: fee}(
                _documentIds[i],
                address(this),
                tokenIds[i]
            );
        }

        return tokenIds;
    }

    function safeTransferAndPayFee(
        address from,
        address to,
        uint256 id,
        uint256 amount,
        bytes memory data
    ) public payable {
        safeTransferFrom(from, to, id, amount, data);
        IVWBLGateway(getGatewayAddress()).payFee{value: msg.value}(tokenIdToTokenInfo[id].documentId, to);
    }

    function safeBatchTransferAndPayFee(
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory amounts,
        bytes memory data
    ) public payable {
        safeBatchTransferFrom(from, to, ids, amounts, data);
        (bool calResult, uint256 fee) = msg.value.tryDiv(ids.length);
        for (uint32 i = 0; i < ids.length; i++) {
            IVWBLGateway(getGatewayAddress()).payFee{value: fee}(tokenIdToTokenInfo[ids[i]].documentId, to);
        }
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

    function supportsInterface(bytes4 interfaceId) public view virtual override(IERC165, ERC1155) returns (bool) {
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
    ) private {
        RoyaltyInfo storage royaltyInfo = tokenIdToRoyaltyInfo[_tokenId];
        royaltyInfo.recipient = _recipient;
        royaltyInfo.royaltiesPercentage = _royaltiesPercentage;
    }
}

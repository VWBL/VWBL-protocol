// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/common/ERC2981.sol";
import "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155Burnable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "../IAccessControlCheckerByERC1155.sol";
import "../../AbstractVWBLToken.sol";

/**
 * @dev Erc1155 which is added Viewable features that only ERC1155 Owner can view digital content
 */
contract VWBLERC1155ERC2981ForMetadata is ERC1155Burnable, AbstractVWBLToken, ERC2981 {
    using Strings for uint256;

    mapping(uint256 => string) private _tokenURIs;

    constructor(
        address _initialOwner,
        address _gatewayProxy,
        address _accessCheckerContract,
        string memory _signMessage
    ) ERC1155("") AbstractVWBLToken(_initialOwner, "", _gatewayProxy, _accessCheckerContract, _signMessage) {}

    function uri(uint256 tokenId) public view override returns (string memory) {
        require(bytes(_tokenURIs[tokenId]).length != 0, "ERC1155: invalid token ID");
        return _tokenURIs[tokenId];
    }

    /**
     * @notice Mint ERC1155, grant access feature and register access condition of digital content.
     * @param _metadataURL metadata URL
     * @param _getKeyURl The URl of VWBL Network(Key management network)
     * @param _amount The token quantity
     * @param _feeNumerator Royalty of ERC1155
     * @param _documentId The Identifier of digital content and decryption key
     */
    function mint(
        string memory _metadataURL,
        string memory _getKeyURl,
        uint256 _amount,
        uint96 _feeNumerator,
        bytes32 _documentId
    ) public payable returns (uint256) {
        uint256 tokenId = ++counter;
        setVWBLInfo(_metadataURL, tokenId, _documentId, msg.sender, _getKeyURl, _feeNumerator);
        _mint(msg.sender, tokenId, _amount, "");

        IAccessControlCheckerByERC1155(accessCheckerContract).grantAccessControlAndRegisterERC1155{value: msg.value}(
            _documentId,
            address(this),
            tokenId
        );

        return tokenId;
    }

    /**
     * @notice Batch mint ERC1155, grant access feature and register access condition of digital content.
     * @param _metadataURLs metadata URL
     * @param _getKeyURl The Url of VWBL Network(Key management network)
     * @param _amounts The array of token quantity
     * @param _feeNumerators Array of Royalty percentage of ERC1155
     * @param _documentIds The array of Identifier of digital content and decryption key
     */
    function mintBatch(
        string[] memory _metadataURLs,
        string memory _getKeyURl,
        uint256[] memory _amounts,
        uint96[] memory _feeNumerators,
        bytes32[] memory _documentIds
    ) public payable returns (uint256[] memory) {
        require(
            _amounts.length == _feeNumerators.length && _feeNumerators.length == _documentIds.length,
            "Invalid array length"
        );

        uint256[] memory tokenIds = new uint256[](_amounts.length);
        for (uint32 i = 0; i < _amounts.length; i++) {
            uint256 tokenId = ++counter;
            tokenIds[i] = tokenId;
            setVWBLInfo(_metadataURLs[i], tokenId, _documentIds[i], msg.sender, _getKeyURl, _feeNumerators[i]);
        }
        _mintBatch(msg.sender, tokenIds, _amounts, "");

        IAccessControlCheckerByERC1155(accessCheckerContract).batchGrantAccessControlAndRegisterERC1155{
            value: msg.value
        }(_documentIds, address(this), tokenIds, msg.sender);

        return tokenIds;
    }

    /**
     * @notice Mint ERC1155, grant access feature by paying fee with ERC20 and register access condition of digital content.
     * @param _metadataURL metadata URL
     * @param _getKeyURl The URl of VWBL Network(Key management network)
     * @param _amount The token quantity
     * @param _feeNumerator Royalty of ERC1155
     * @param _documentId The Identifier of digital content and decryption key
     * @param _erc20Address The address of the ERC20 token used to pay the fee
     * @param _feePayer The address of the entity paying the fee
     */
    function mintWithERC20(
        string memory _metadataURL,
        string memory _getKeyURl,
        uint256 _amount,
        uint96 _feeNumerator,
        bytes32 _documentId,
        address _erc20Address,
        address _feePayer
    ) public payable returns (uint256) {
        uint256 tokenId = ++counter;
        setVWBLInfo(_metadataURL, tokenId, _documentId, msg.sender, _getKeyURl, _feeNumerator);
        _mint(msg.sender, tokenId, _amount, "");

        IAccessControlCheckerByERC1155(accessCheckerContract).grantAccessControlWithERC20AndRegisterERC1155(
            _documentId,
            address(this),
            tokenId,
            _erc20Address,
            _feePayer
        );

        return tokenId;
    }

    /**
     * @notice Batch mint ERC1155, grant access feature by paying fee with ERC20 and register access condition of digital content.
     * @param _metadataURLs metadata URL
     * @param _getKeyURl The Url of VWBL Network(Key management network)
     * @param _amounts The array of token quantity
     * @param _feeNumerators Array of Royalty percentage of ERC1155
     * @param _documentIds The array of Identifier of digital content and decryption key
     * @param _erc20Address The address of the ERC20 token used to pay the fee
     * @param _feePayer The address of the entity paying the fee
     */
    function mintBatchWithERC20(
        string[] memory _metadataURLs,
        string memory _getKeyURl,
        uint256[] memory _amounts,
        uint96[] memory _feeNumerators,
        bytes32[] memory _documentIds,
        address _erc20Address,
        address _feePayer
    ) public payable returns (uint256[] memory) {
        require(
            _amounts.length == _feeNumerators.length && _feeNumerators.length == _documentIds.length,
            "Invalid array length"
        );

        uint256[] memory tokenIds = new uint256[](_amounts.length);
        for (uint32 i = 0; i < _amounts.length; i++) {
            uint256 tokenId = ++counter;
            tokenIds[i] = tokenId;
            setVWBLInfo(_metadataURLs[i], tokenId, _documentIds[i], msg.sender, _getKeyURl, _feeNumerators[i]);
        }
        _mintBatch(msg.sender, tokenIds, _amounts, "");

        IAccessControlCheckerByERC1155(accessCheckerContract).batchGrantAccessControlWithERC20AndRegisterERC1155(
            _documentIds, 
            address(this), 
            tokenIds, 
            msg.sender,
            _erc20Address,
            _feePayer
        );

        return tokenIds;
    }

    function setVWBLInfo(
        string memory _metadataURL,
        uint256 _tokenId,
        bytes32 _documentId,
        address _minter,
        string memory _getKeyURl,
        uint96 _feeNumerator
    ) private {
        tokenIdToTokenInfo[_tokenId].documentId = _documentId;
        tokenIdToTokenInfo[_tokenId].minterAddress = _minter;
        tokenIdToTokenInfo[_tokenId].getKeyURl = _getKeyURl;
        _tokenURIs[_tokenId] = _metadataURL;
        if (_feeNumerator > 0) {
            _setTokenRoyalty(_tokenId, _minter, _feeNumerator);
        }
    }

    /**
     * @dev See {IERC165-supportsInterface}.
     */
    function supportsInterface(bytes4 interfaceId) public view virtual override(ERC1155, ERC2981) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/common/ERC2981.sol";
import "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155Burnable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "./IAccessControlCheckerByERC1155.sol";
import "../AbstractVWBLToken.sol";

/**
 * @dev Erc1155 which is added Viewable features that only ERC1155 Owner can view digital content
 */
contract VWBLERC1155ERC2981 is ERC1155Burnable, AbstractVWBLToken, ERC2981 {
    using Strings for uint256;

    constructor(
        address _initialOwner,
        string memory _baseURI,
        address _gatewayProxy,
        address _accessCheckerContract,
        string memory _signMessage
    ) ERC1155(_baseURI) AbstractVWBLToken(_initialOwner, _baseURI, _gatewayProxy, _accessCheckerContract, _signMessage) {}

    function uri(uint256 tokenId) public view override returns (string memory) {
        return bytes(baseURI).length > 0 ? string(abi.encodePacked(baseURI, tokenId.toString())) : "";
    }

    /**
     * @notice Mint ERC1155, grant access feature and register access condition of digital content.
     * @param _getKeyURl The URl of VWBL Network(Key management network)
     * @param _amount The token quantity
     * @param _feeNumerator Royalty of ERC1155
     * @param _documentId The Identifier of digital content and decryption key
     */
    function mint(
        string memory _getKeyURl,
        uint256 _amount,
        uint96 _feeNumerator,
        bytes32 _documentId
    ) public payable returns (uint256) {
        uint256 tokenId = ++counter;
        tokenIdToTokenInfo[tokenId].documentId = _documentId;
        tokenIdToTokenInfo[tokenId].minterAddress = msg.sender;
        tokenIdToTokenInfo[tokenId].getKeyURl = _getKeyURl;
        _mint(msg.sender, tokenId, _amount, "");
        if (_feeNumerator > 0) {
            _setTokenRoyalty(tokenId, msg.sender, _feeNumerator);
        }

        IAccessControlCheckerByERC1155(accessCheckerContract).grantAccessControlAndRegisterERC1155{value: msg.value}(
            _documentId,
            address(this),
            tokenId
        );

        return tokenId;
    }

    /**
     * @notice Batch mint ERC1155, grant access feature and register access condition of digital content.
     * @param _getKeyURl The Url of VWBL Network(Key management network)
     * @param _amounts The array of token quantity
     * @param _feeNumerators Array of Royalty percentage of ERC1155
     * @param _documentIds The array of Identifier of digital content and decryption key
     */
    function mintBatch(
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
            tokenIdToTokenInfo[tokenId].documentId = _documentIds[i];
            tokenIdToTokenInfo[tokenId].minterAddress = msg.sender;
            tokenIdToTokenInfo[tokenId].getKeyURl = _getKeyURl;
            if (_feeNumerators[i] > 0) {
                _setTokenRoyalty(tokenId, msg.sender, _feeNumerators[i]);
            }
        }

        _mintBatch(msg.sender, tokenIds, _amounts, "");

        IAccessControlCheckerByERC1155(accessCheckerContract).batchGrantAccessControlAnderRegisterERC1155{value: msg.value}(
            _documentIds,
            address(this),
            tokenIds,
            msg.sender
        );

        return tokenIds;
    }

    /**
     * @dev See {IERC165-supportsInterface}.
     */
    function supportsInterface(bytes4 interfaceId) public view virtual override(ERC1155, ERC2981) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}

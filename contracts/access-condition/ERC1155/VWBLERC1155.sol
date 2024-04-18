// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155Burnable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "./IAccessControlCheckerByERC1155.sol";
import "../AbstractVWBLToken.sol";

/**
 * @dev Erc1155 which is added Viewable features that only ERC1155 Owner can view digital content
 */
contract VWBLERC1155 is ERC1155Burnable, AbstractVWBLToken {
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

    function mint(
        string memory _getKeyURl,
        uint256 _amount,
        bytes32 _documentId
    ) public payable returns (uint256) {
        uint256 tokenId = ++counter;
        tokenIdToTokenInfo[tokenId].documentId = _documentId;
        tokenIdToTokenInfo[tokenId].minterAddress = msg.sender;
        tokenIdToTokenInfo[tokenId].getKeyURl = _getKeyURl;
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
     * @param _getKeyURl The Url of VWBL Network(Key management network)
     * @param _amounts The array of token quantity
     * @param _documentIds The array of Identifier of digital content and decryption key
     */
    function mintBatch(
        string memory _getKeyURl,
        uint256[] memory _amounts,
        bytes32[] memory _documentIds
    ) public payable returns (uint256[] memory) {
        require(_amounts.length == _documentIds.length, "Invalid array length");

        uint256[] memory tokenIds = new uint256[](_amounts.length);
        for (uint32 i = 0; i < _amounts.length; i++) {
            uint256 tokenId = ++counter;
            tokenIds[i] = tokenId;
            tokenIdToTokenInfo[tokenId].documentId = _documentIds[i];
            tokenIdToTokenInfo[tokenId].minterAddress = msg.sender;
            tokenIdToTokenInfo[tokenId].getKeyURl = _getKeyURl;
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
}

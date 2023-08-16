// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155Burnable.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./IAccessControlCheckerByERC1155.sol";
import "./ERC1155Enumerable.sol";
import "../AbstractVWBLToken.sol";

/**
 * @dev Erc1155 which is added Viewable features that only ERC1155 Owner can view digital content
 */
contract VWBLERC1155 is Ownable, ERC1155Enumerable, ERC1155Burnable, AbstractVWBLToken {
    using SafeMath for uint256;
    using Strings for uint256;

    constructor(
        string memory _baseURI,
        address _gatewayProxy,
        address _accessCheckerContract,
        string memory _signMessage
    ) ERC1155(_baseURI) AbstractVWBLToken(_baseURI, _gatewayProxy, _accessCheckerContract, _signMessage) {}

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
}

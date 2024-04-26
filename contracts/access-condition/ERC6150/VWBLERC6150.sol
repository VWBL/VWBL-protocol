// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./ERC6150ParentTransferable.sol";
import "../ERC721/IAccessControlCheckerByNFT.sol";
import "../AbstractVWBLToken.sol";

/**
 * @dev ERC6150 which is added Viewable features that only ERC6150 Owner can view digital content
 */
contract VWBLERC6150 is Ownable, ERC6150ParentTransferable, AbstractVWBLToken {
    using Strings for uint256;

    constructor(
        address _initialOwner,
        string memory _baseURI,
        address _gatewayProxy,
        address _accessCheckerContract,
        string memory _signMessage
    ) ERC6150("VWBL", "VWBL") AbstractVWBLToken(_initialOwner, _baseURI, _gatewayProxy, _accessCheckerContract, _signMessage) {}

    /**
     * @notice BaseURI for computing {tokenURI}.
     */
    function _baseURI() internal view override returns (string memory) {
        return baseURI;
    }

    /**
     * @notice Mint ERC6150, grant access feature and register access condition of digital content.
     * @param _getKeyURl The URl of VWBL Network(Key management network)
     * @param _parentId parent token Id
     * @param _documentId The Identifier of digital content and decryption key
     */
    function mint(
        string memory _getKeyURl,
        uint256 _parentId,
        bytes32 _documentId
    ) public payable returns (uint256) {
        uint256 tokenId = ++counter;
        tokenIdToTokenInfo[tokenId].documentId = _documentId;
        tokenIdToTokenInfo[tokenId].minterAddress = msg.sender;
        tokenIdToTokenInfo[tokenId].getKeyURl = _getKeyURl;
        _safeMintWithParent(msg.sender, _parentId, tokenId);
        IAccessControlCheckerByNFT(accessCheckerContract).grantAccessControlAndRegisterNFT{value: msg.value}(
            _documentId,
            address(this),
            tokenId
        );

        return tokenId;
    }

    function supportsInterface(bytes4 interfaceId) public view virtual override(IERC165, ERC6150) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}

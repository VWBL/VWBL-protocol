// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/utils/introspection/IERC165.sol";

import "./IAccessControlCheckerByNFT.sol";
import "../AbstractVWBLToken.sol";
import "../AbstractVWBLToken.sol";

/**
 * @dev NFT which is added Viewable features that only NFT Owner can view digital content
 */
contract VWBLERC721 is AbstractVWBLToken, ERC721Enumerable {
    constructor(
        address _initialOwner,
        string memory _baseURI,
        address _gatewayProxy,
        address _accessCheckerContract,
        string memory _signMessage
    ) ERC721("VWBL", "VWBL") AbstractVWBLToken(_initialOwner, _baseURI, _gatewayProxy, _accessCheckerContract, _signMessage) {}

    /**
     * @notice BaseURI for computing {tokenURI}.
     */
    function _baseURI() internal view override returns (string memory) {
        return baseURI;
    }

    /**
     * @notice Mint NFT, grant access feature and register access condition of digital content.
     * @param _getKeyURl The URl of VWBL Network(Key management network)
     * @param _documentId The Identifier of digital content and decryption key
     */
    function mint(string memory _getKeyURl, bytes32 _documentId) public payable returns (uint256) {
        uint256 tokenId = ++counter;
        TokenInfo memory tokenInfo = TokenInfo(_documentId, msg.sender, _getKeyURl);
        tokenIdToTokenInfo[tokenId] = tokenInfo;
        _mint(msg.sender, tokenId);
        // grant access control to nft and pay vwbl fee and register nft data to access control checker contract
        IAccessControlCheckerByNFT(accessCheckerContract).grantAccessControlAndRegisterNFT{value: msg.value}(
            _documentId,
            address(this),
            tokenId
        );

        return tokenId;
    }
}

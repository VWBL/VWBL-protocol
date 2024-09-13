// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/utils/introspection/IERC165.sol";

import "./IAccessControlCheckerByNFT.sol";
import "../AbstractVWBLToken.sol";
import "./IViewPermission.sol";

/**
 * @dev NFT which is added Viewable features that only NFT Owner can view digital content
 */
contract VWBLERC721 is Ownable, AbstractVWBLToken, ERC721Enumerable, IViewPermission {
    // tokenId => grantee => bool
    mapping(uint256 => mapping(address => bool)) public hasViewPermission;

    event ViewPermissionGranted(uint256 tokenId, address grantee);
    event ViewPermissionRevoked(uint256 tokenId, address revoker);

    constructor(
        address _initialOwner,
        string memory _baseURI,
        address _gatewayProxy,
        address _accessCheckerContract,
        string memory _signMessage
    )
        ERC721("VWBL", "VWBL")
        AbstractVWBLToken(_initialOwner, _baseURI, _gatewayProxy, _accessCheckerContract, _signMessage)
    {}

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

    /**
     * @notice Batch Mint NFT, grant access feature and register access condition of digital content.
     * @param _getKeyURl The URl of VWBL Network(Key management network)
     * @param _documentIds The Identifier array of digital content and decryption key
     */
    function batchMint(string memory _getKeyURl, bytes32[] memory _documentIds) public payable returns (uint256) {
        uint256[] memory tokenIds = new uint256[](_documentIds.length);
        for (uint i = 0; i < _documentIds.length; i++) {
            uint256 tokenId = ++counter;
            tokenIds[i] = tokenId;
            TokenInfo memory tokenInfo = TokenInfo(_documentIds[i], msg.sender, _getKeyURl);
            tokenIdToTokenInfo[tokenId] = tokenInfo;
            _mint(msg.sender, tokenId);
        }
        IAccessControlCheckerByNFT(accessCheckerContract).batchGrantAccessControlAndRegisterNFT{value: msg.value}(
            _documentIds,
            msg.sender,
            address(this),
            tokenIds
        );
    }

    /**
     * @notice Grant view permission to grantee from nft owner
     * @param tokenId The identifier of NFT
     * @param grantee The Address who grantee of view permission right
     */
    function grantViewPermission(uint256 tokenId, address grantee) public returns (uint256) {
        require(msg.sender == ownerOf(tokenId), "msg sender is not nft owner");
        hasViewPermission[tokenId][grantee] = true;
        emit ViewPermissionGranted(tokenId, grantee);
        return tokenId;
    }

    /**
     * @notice Revoke view permission from nft owner
     * @param tokenId The identifier of the NFT
     * @param revoker The address revoking the view permission
     * @return The tokenId of the NFT token
     */
    function revokeViewPermission(uint256 tokenId, address revoker) public returns (uint256) {
        require(msg.sender == ownerOf(tokenId), "msg sender is not nft owner");
        hasViewPermission[tokenId][revoker] = false;
        emit ViewPermissionRevoked(tokenId, revoker);
        return tokenId;
    }

    /**
     * @notice Check view permission to user
     * @param tokenId The Identifier of NFT
     * @param user The address of verification target
     */
    function checkViewPermission(uint256 tokenId, address user) public view returns (bool) {
        return hasViewPermission[tokenId][user];
    }
}

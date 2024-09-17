// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/token/common/ERC2981.sol";

import "./IAccessControlCheckerByNFT.sol";
import "../AbstractVWBLToken.sol";
import "./IViewPermission.sol";

/**
 * @dev NFT which is added Viewable features that only NFT Owner can view digital content
 */
contract VWBLERC721ERC2981 is Ownable, AbstractVWBLToken, ERC721Enumerable, ERC2981, IViewPermission {
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
     * @param _feeNumerator Royalty of NFT
     * @param _documentId The Identifier of digital content and decryption key
     */
    function mint(
        string memory _getKeyURl,
        uint96 _feeNumerator,
        bytes32 _documentId
    ) public payable returns (uint256) {
        uint256 tokenId = ++counter;
        setVWBLInfo(_documentId, msg.sender, _getKeyURl, tokenId, _feeNumerator);

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
     * @param _feeNumerators They Array of royalty of NFT
     * @param _documentIds The Identifier array of digital content and decryption key
     */
    function batchMint(string memory _getKeyURl, uint96[] memory _feeNumerators, bytes32[] memory _documentIds) public payable returns (uint256) {
        uint256[] memory tokenIds = new uint256[](_documentIds.length);
        for (uint i = 0; i < _documentIds.length; i++) {
            uint256 tokenId = ++counter;
            tokenIds[i] = tokenId;
            setVWBLInfo(_documentIds[i], msg.sender, _getKeyURl, tokenId, _feeNumerators[i]);
        }
        // batch grant access control to nft and pay vwbl fee and register nft data to access control checker contract
        IAccessControlCheckerByNFT(accessCheckerContract).batchGrantAccessControlAndRegisterNFT{value: msg.value}(
            _documentIds,
            msg.sender,
            address(this),
            tokenIds
        );
    }

    /**
     * @notice Mint NFT, grant access feature by paying fee with ERC20 and register access condition of digital content.
     * @param _getKeyURl The URl of VWBL Network(Key management network)
     * @param _feeNumerator Royalty of NFT
     * @param _documentId The Identifier of digital content and decryption key
     * @param _erc20Address The address of the ERC20 token used to pay the fee
     * @param _feePayer The address of the entity paying the fee
     */
    function mintWithERC20(
        string memory _getKeyURl,
        uint96 _feeNumerator,
        bytes32 _documentId,
        address _erc20Address,
        address _feePayer
    ) public returns (uint256) {
        uint256 tokenId = ++counter;
        setVWBLInfo(_documentId, msg.sender, _getKeyURl, tokenId, _feeNumerator);
        // grant access control to nft, pay vwbl fee with erc20 and register nft data to access control checker contract
        IAccessControlCheckerByNFT(accessCheckerContract).grantAccessControlWithERC20AndRegisterNFT(
            _documentId,
            address(this),
            tokenId,
            _erc20Address,
            _feePayer
        );
        return tokenId;
    }

    /**
     * @notice Batch mint NFT, grant access feature by paying fee with ERC20 and register access condition of digital content.
     * @param _getKeyURl The URl of VWBL Network(Key management network)
     * @param _feeNumerators They Array of royalty of NFT
     * @param _documentIds The Identifier of digital content and decryption key
     * @param _erc20Address The address of the ERC20 token used to pay the fee
     * @param _feePayer The address of the entity paying the fee
     */
    function batchMintWithERC20(
        string memory _getKeyURl, 
        uint96[] memory _feeNumerators,
        bytes32[] memory _documentIds,
        address _erc20Address,
        address _feePayer
    ) public {
        uint256[] memory tokenIds = new uint256[](_documentIds.length);
        for (uint i = 0; i < _documentIds.length; i++) {
            uint256 tokenId = ++counter;
            tokenIds[i] = tokenId;
            setVWBLInfo(_documentIds[i], msg.sender, _getKeyURl, tokenId, _feeNumerators[i]);
        }
        // batch grant access control to nft, pay vwbl fee with erc20 and register nft data to access control checker contract
        IAccessControlCheckerByNFT(accessCheckerContract).batchGrantAccessControlWithERC20AndRegisterNFT(
            _documentIds,
            msg.sender,
            address(this),
            tokenIds,
            _erc20Address,
            _feePayer
        );
    }

    function setVWBLInfo(
        bytes32 _documentId,
        address _minter,
        string memory _getKeyURl,
        uint _tokenId,
        uint96 _feeNumerator
    ) private {
        TokenInfo memory tokenInfo = TokenInfo(_documentId, _minter, _getKeyURl);
        tokenIdToTokenInfo[_tokenId] = tokenInfo;
        _mint(_minter, _tokenId);
        if (_feeNumerator > 0) {
            _setTokenRoyalty(_tokenId, _minter, _feeNumerator);
        }
    }

    /**
     * @dev See {IERC165-supportsInterface}.
     */
    function supportsInterface(bytes4 interfaceId)
        public
        view
        virtual
        override(ERC721Enumerable, ERC2981)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
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

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./ERC6150ParentTransferable.sol";
import "../ERC721/IAccessControlCheckerByNFT.sol";
import "../AbstractVWBLToken.sol";
import "./IViewPermissionERC6150.sol";

/**
 * @dev ERC6150 which is added Viewable features that only ERC6150 Owner can view digital content
 */
contract VWBLERC6150 is Ownable, ERC6150ParentTransferable, AbstractVWBLToken, IViewPermissionERC6150 {
    using SafeMath for uint256;
    using Strings for uint256;

    // tokenId => grantee => bool
    mapping(uint256 => mapping(address => bool)) public hasViewPermission;
    // parentTokenId => grantee => bool
    mapping(uint256 => mapping(address => bool)) public hasDirPermission;

    event ViewPermissionGranted(uint256 tokenId, address grantee);
    event ViewPermissionRevoked(uint256 tokenId, address revoker);
    event AncestorPermissionGranted(uint256 tokenId, address grantee);
    event AncestorPermissionRevoked(uint256 tokenId, address revoker);

    constructor(
        string memory _baseURI,
        address _gatewayProxy,
        address _accessCheckerContract,
        string memory _signMessage
    ) ERC6150("VWBL", "VWBL") AbstractVWBLToken(_baseURI, _gatewayProxy, _accessCheckerContract, _signMessage) {}

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

    /**
     * @notice Grant view permission to a specific address for a specific ERC6150 token from ERC6150 owner.
     * @param tokenId The identifier of the ERC6150 token.
     * @param grantee The address to which view permission will be granted.
     * @param toDir A boolean indicating whether to grant view permission directly or single ERC6150 token.
     * @return The tokenId of the ERC6150 token for which permission was granted.
     */
    function grantViewPermission(
        uint256 tokenId,
        address grantee,
        bool toDir
    ) public returns (uint256) {
        if (toDir) {
            return grantViewPermissionToDir(tokenId, grantee);
        } else {
            return grantViewPermission(tokenId, grantee);
        }
    }

    /**
     * @notice Grant view permission to grantee from ERC6150 owner
     * @param tokenId The identifier of ERC6150
     * @param grantee The Address who grantee of view permission right
     */
    function grantViewPermission(uint256 tokenId, address grantee) public returns (uint256) {
        require(msg.sender == ownerOf(tokenId), "msg sender is not ERC6150 owner");
        hasViewPermission[tokenId][grantee] = true;
        emit ViewPermissionGranted(tokenId, grantee);
        return tokenId;
    }

    /**
     * @notice Revoke view permission from ERC6150 owner
     * @param tokenId The identifier of the ERC6150
     * @param revoker The address revoking the view permission
     * @return The tokenId of the ERC6150
     */
    function revokeViewPermission(uint256 tokenId, address revoker) public returns (uint256) {
        require(msg.sender == ownerOf(tokenId), "msg sender is not ERC6150 owner");
        hasViewPermission[tokenId][revoker] = false;
        emit ViewPermissionRevoked(tokenId, revoker);
        return tokenId;
    }

    /**
     * @notice Grant view permission to Directory(ERC6150 under parent token) from ERC6150 owner
     * @param tokenId The identifier of the ERC6150
     * @param grantee The address of the grantee receiving view permission
     * @return The tokenId of the ERC6150
     */
    function grantViewPermissionToDir(uint256 tokenId, address grantee) public returns (uint256) {
        require(msg.sender == ownerOf(tokenId), "msg sender is not ERC6150 owner");
        hasDirPermission[tokenId][grantee] = true;
        hasViewPermission[tokenId][grantee] = true;
        emit ViewPermissionGranted(tokenId, grantee);
        emit AncestorPermissionGranted(tokenId, grantee);
        return tokenId;
    }

    /**
     * @notice Revoke ancestor permission from ERC6150 owner
     * @param tokenId The identifier of the ERC6150
     * @param revoker The address revoking the ancestor permission
     * @return The tokenId of the ERC6150
     */
    function revokeDirPermission(uint256 tokenId, address revoker) public returns (uint256) {
        require(msg.sender == ownerOf(tokenId), "msg sender is not ERC6150 owner");
        hasDirPermission[tokenId][revoker] = false;
        emit AncestorPermissionRevoked(tokenId, revoker);
        return tokenId;
    }

    /**
     * @notice Check view permission to user
     * @param tokenId The Identifier of ERC6150
     * @param user The address of verification target
     */
    function checkViewPermission(uint256 tokenId, address user) public view returns (bool) {
        return hasViewPermission[tokenId][user] || checkDirPermission(tokenId, user);
    }

    /**
     * @notice Check if the user has Directory(ERC6150 under parent token) permission for a specific ERC6150
     * @param tokenId The identifier of the ERC6150
     * @param user The address of verification target
     * @return A boolean indicating whether the user has ancestor permission
     */
    function checkDirPermission(uint256 tokenId, address user) public view returns (bool) {
        if (tokenId == 0) return false;
        uint256 parentTokenId = parentOf(tokenId);
        return hasDirPermission[parentTokenId][user] || checkDirPermission(parentTokenId, user);
    }
}

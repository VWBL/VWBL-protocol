// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "../../gateway/IGatewayProxy.sol";
import "../../gateway/IVWBLGatewayV2.sol";
import "../IAccessControlChecker.sol";
import "./IAccessControlCheckerByNFT.sol";
import "../AbstractControlChecker.sol";
import "../IVWBL.sol";

/**
 * @dev VWBL's access condition contract which is defined by NFT Owner has access right of digital content
 *      and NFT Minter is digital contract creator(decryption key creator)
 */
contract AccessControlCheckerByNFT is AbstractControlChecker, Ownable {
    address public gatewayProxy;

    event nftDataRegistered(address contractAddress, uint256 tokenId);

    constructor(
        address _initialOwner,
        bool _setMinterHasOnlySetKeyRights,
        address _gatewayProxy
    ) AbstractControlChecker(_setMinterHasOnlySetKeyRights) Ownable(_initialOwner) {
        gatewayProxy = _gatewayProxy;
    }

    /**
     * @notice Get VWBL gateway address
     */
    function getGatewayAddress() public view returns (address) {
        return IGatewayProxy(gatewayProxy).getGatewayAddress();
    }

    /**
     * @notice Get array of documentIds, NFT contract address, tokenId.
     */
    function getNFTDatas() public view returns (bytes32[] memory, Token[] memory) {
        bytes32[] memory allDocumentIds = IVWBLGatewayV2(getGatewayAddress()).getDocumentIds();
        bytes32[] memory tempDocumentIds = new bytes32[](allDocumentIds.length);
        Token[] memory tempTokens = new Token[](allDocumentIds.length);
        uint256 count;
        for (uint256 i = 0; i < allDocumentIds.length; i++) {
            if (documentIdToToken[allDocumentIds[i]].contractAddress != address(0)) {
                count++;
                tempDocumentIds[count - 1] = allDocumentIds[i];
                tempTokens[count - 1] = documentIdToToken[allDocumentIds[i]];
            }
        }

        bytes32[] memory documentIds = new bytes32[](count);
        Token[] memory tokens = new Token[](count);
        for (uint256 i = 0; i < count; i++) {
            documentIds[i] = tempDocumentIds[i];
            tokens[i] = tempTokens[i];
        }
        return (documentIds, tokens);
    }

    /**
     * @notice Return owner address
     * @param documentId The Identifier of digital content and decryption key
     */
    function getOwnerAddress(bytes32 documentId) external view returns (address) {
        Token memory token = documentIdToToken[documentId];
        return IERC721(token.contractAddress).ownerOf(token.tokenId);
    }

    /**
     * @notice Return true if user is NFT Owner or Minter of digital content.
     *         This function is called by VWBL Gateway contract.
     * @param user The address of decryption key requester or decryption key sender to VWBL Network
     * @param documentId The Identifier of digital content and decryption key
     */
    function checkAccessControl(address user, bytes32 documentId) external pure returns (bool) {
        return false;
    }

    /**
     * @notice Grant access control, register access condition and NFT info
     * @param documentId The Identifier of digital content and decryption key
     * @param nftContract The contract address of NFT
     * @param tokenId The Identifier of NFT
     */
    function grantAccessControlAndRegisterNFT(
        bytes32 documentId,
        address nftContract,
        uint256 tokenId
    ) public payable {
        IVWBLGatewayV2(getGatewayAddress()).grantAccessControl{value: msg.value}(
            documentId,
            address(this),
            IVWBL(nftContract).getMinter(tokenId)
        );

        documentIdToToken[documentId].contractAddress = nftContract;
        documentIdToToken[documentId].tokenId = tokenId;
        emit nftDataRegistered(nftContract, tokenId);
    }

    /**
     * @notice Batch grant access control, register access condition and NFT info
     * @param documentIds An array of Identifiers for the digital content and decryption keys
     * @param minter The address of the digital content creator for all provided document IDs
     * @param nftContract The contract address of the NFT
     * @param tokenIds An array of Identifiers for the NFTs corresponding to each document ID
     */
    function batchGrantAccessControlAndRegisterNFT(
        bytes32[] memory documentIds,
        address minter,
        address nftContract,
        uint256[] memory tokenIds
    ) public payable {
        require(documentIds.length == tokenIds.length, "documentIds and tokenIds is not same length");
        IVWBLGatewayV2(getGatewayAddress()).batchGrantAccessControl{value: msg.value}(
            documentIds,
            address(this),
            minter
        );

        for (uint256 i = 0; i < documentIds.length; i++) {
            documentIdToToken[documentIds[i]].contractAddress = nftContract;
            documentIdToToken[documentIds[i]].tokenId = tokenIds[i];
            emit nftDataRegistered(nftContract, tokenIds[i]);
        }
    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "./IVWBL.sol";
import "../../gateway/IGatewayProxy.sol";
import "../../gateway/IVWBLGateway.sol";
import "../IAccessControlChecker.sol";
import "./IAccessControlCheckerByNFT.sol";
import "../AbstractControlChecker.sol";

/**
 * @dev VWBL's access condition contract which is defined by NFT Owner has access right of digital content
 *      and NFT Minter is digital contract creator(decryption key creator)
 */
contract AccessControlCheckerByNFT is AbstractControlChecker, Ownable {
    address public gatewayProxy;

    event nftDataRegistered(address contractAddress, uint256 tokenId);

    constructor(address _gatewayProxy) {
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
        bytes32[] memory allDocumentIds = IVWBLGateway(getGatewayAddress()).getDocumentIds();
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
    function checkAccessControl(address user, bytes32 documentId) external view returns (bool) {
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
        IVWBLGateway(getGatewayAddress()).grantAccessControl{value: msg.value}(
            documentId,
            address(this),
            IVWBL(nftContract).getMinter(tokenId)
        );

        documentIdToToken[documentId].contractAddress = nftContract;
        documentIdToToken[documentId].tokenId = tokenId;

        emit nftDataRegistered(nftContract, tokenId);
    }
}

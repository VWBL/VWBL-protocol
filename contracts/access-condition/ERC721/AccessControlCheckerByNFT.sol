// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "./IVWBL.sol";
import "../../gateway/IVWBLGateway.sol";
import "../IAccessControlChecker.sol";
import "./IAccessControlCheckerByNFT.sol";

/**
 * @dev VWBL's access condition contract which is defined by NFT Owner has access right of digital content
 *      and NFT Minter is digital contract creator(decryption key creator)
 */
contract AccessControlCheckerByNFT is IAccessControlCheckerByNFT, Ownable {
    struct Token {
        address contractAddress;
        uint256 tokenId;
    }
    mapping(bytes32 => Token) public documentIdToToken;

    address public vwblGateway;

    event nftDataRegistered(address contractAddress, uint256 tokenId);
    event vwblGatewayChanged(address oldVWBLGateway, address newVWBLGateway);

    constructor(address _vwblGateway) {
        vwblGateway = _vwblGateway;
    }

    /**
     * @notice Get array of documentIds, NFT contract address, tokenId.
     */
    function getNFTDatas() public view returns (bytes32[] memory, Token[] memory) {
        bytes32[] memory allDocumentIds = IVWBLGateway(vwblGateway).getDocumentIds();
        uint256 documentIdLength;
        for (uint256 i = 0; i < allDocumentIds.length; i++) {
            if (documentIdToToken[allDocumentIds[i]].contractAddress != address(0)) {
                documentIdLength++;
            }
        }

        bytes32[] memory documentIds = new bytes32[](documentIdLength);
        Token[] memory tokens = new Token[](documentIdLength);
        for (uint256 i = 0; i < allDocumentIds.length; i++) {
            if (documentIdToToken[allDocumentIds[i]].contractAddress != address(0)) {
                documentIds[i] = allDocumentIds[i];
                tokens[i] = documentIdToToken[allDocumentIds[i]];
            }
        }
        return (documentIds, tokens);
    }

    /**
     * @notice Return owner address
     * @param documentId The Identifier of digital content and decryption key
     */
    function getOwnerAddress(
        bytes32 documentId
    ) external view returns (address) {
        return IERC721(token.contractAddress).ownerOf(token.tokenId);
    }

    /**
     * @notice Return true if user is NFT Owner or Minter of digital content.
     *         This function is called by VWBL Gateway contract.
     * @param user The address of decryption key requester or decryption key sender to VWBL Network
     * @param documentId The Identifier of digital content and decryption key
     */
    function checkAccessControl(
        address user,
        bytes32 documentId
    ) external view returns (bool) {
        Token memory token = documentIdToToken[documentId];

        if (
            IVWBL(token.contractAddress).getMinter(token.tokenId) == user
        ) {
            return true;
        }

        return false;
    }

    /**
     * @notice Grant access control, register access condition and NFT info
     * @param documentId The Identifier of digital content and decryption key
     * @param nftContract The contract address of NFT
     * @param tokenId The Identifier of NFT
     */
    function grantAccessControlAndRegisterNFT(bytes32 documentId, address nftContract, uint256 tokenId) public payable {
        IVWBLGateway(vwblGateway).grantAccessControl{value: msg.value}(documentId, address(this));

        documentIdToToken[documentId].contractAddress = nftContract;
        documentIdToToken[documentId].tokenId = tokenId;

        emit nftDataRegistered(nftContract, tokenId);
    }


    /**
     * @notice Set new VWBL Gateway contract address
     * @param newVWBLGateway The contract address of new VWBLGateway
     */
    function setVWBLGateway(address newVWBLGateway) public onlyOwner {
        require(vwblGateway != newVWBLGateway);
        address oldVWBLGateway = vwblGateway;
        vwblGateway = newVWBLGateway;
        emit vwblGatewayChanged(oldVWBLGateway, newVWBLGateway);
    }
}

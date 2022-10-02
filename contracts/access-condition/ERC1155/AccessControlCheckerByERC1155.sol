// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./dependencies/IERC1155.sol";
import "../../gateway/IVWBLGateway.sol";
import "../IAccessControlChecker.sol";
import "./IAccessControlCheckerByERC1155.sol";
import "./IVWBLERC1155.sol";

/**
 * @dev VWBL's access condition contract which defines that ERC1155 Owner has access right of digital content
 *      and ERC1155 Minter is digital content creator(decryption key creator).
 */
contract AccessControlCheckerByERC1155 is IAccessControlCheckerByERC1155, Ownable {
    struct Token {
        address contractAddress;
        uint256 tokenId;
    }
    mapping(bytes32 => Token) public documentIdToToken;

    address public vwblGateway;

    event erc1155DataRegistered(address contractAddress, uint256 tokenId);
    event vwblGatewayChanged(address oldVWBLGateway, address newVWBLGateway);

    constructor(address _vwblGateway) public {
        vwblGateway = _vwblGateway;
    }

    /**
     * @notice Get array of documentIds, ERC11555 contract address, tokenId.
     */
    function getERC1155Datas() public view returns (bytes32[] memory, Token[] memory) {
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
    function getOwnerAddress(bytes32 documentId) external view returns (address) {
        return address(0);
    }

    /**
     * @notice Return true if user is ERC1155 Owner or Minter of digital content.
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
            IERC1155(token.contractAddress).balanceOf(user, token.tokenId) > 0
            || IVWBLERC1155(token.contractAddress).getMinter(token.tokenId) == user
        ) {
            return true;
        }

        return false;
    }

    /**
     * @notice Grant access control, register access condition and ERC1155 info
     * @param documentId The Identifier of digital content and decryption key
     * @param erc1155Contract The contract address of ERC1155
     * @param tokenId The Identifier of ERC1155
     */
    function grantAccessControlAndRegisterERC1155(bytes32 documentId, address erc1155Contract, uint256 tokenId) public payable {
        IVWBLGateway(vwblGateway).grantAccessControl{value: msg.value}(documentId, address(this));

        documentIdToToken[documentId].contractAddress = erc1155Contract;
        documentIdToToken[documentId].tokenId = tokenId;

        emit erc1155DataRegistered(erc1155Contract, tokenId);
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

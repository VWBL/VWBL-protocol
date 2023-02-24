// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/interfaces/IERC1155.sol";
import "../../gateway/IGatewayProxy.sol";
import "../../gateway/IVWBLGateway.sol";
import "../IAccessControlChecker.sol";
import "./IAccessControlCheckerByERC1155.sol";
import "./IVWBLERC1155.sol";
import "../AbstractControlChecker.sol";

/**
 * @dev VWBL's access condition contract which defines that ERC1155 Owner has access right of digital content
 *      and ERC1155 Minter is digital content creator(decryption key creator).
 */
contract AccessControlCheckerByERC1155 is AbstractControlChecker, Ownable {
    address public gatewayProxy;

    event erc1155DataRegistered(address contractAddress, uint256 tokenId);

    constructor(address _gatewayProxy) public {
        gatewayProxy = _gatewayProxy;
    }

    /**
     * @notice Get VWBL gateway address
     */
    function getGatewayAddress() public view returns (address) {
        return IGatewayProxy(gatewayProxy).getGatewayAddress();
    }

    /**
     * @notice Get array of documentIds, ERC11555 contract address, tokenId.
     */
    function getERC1155Datas() public view returns (bytes32[] memory, Token[] memory) {
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
        return address(0);
    }

    /**
     * @notice Return true if user is ERC1155 Owner or Minter of digital content.
     *         This function is called by VWBL Gateway contract.
     * @param user The address of decryption key requester or decryption key sender to VWBL Network
     * @param documentId The Identifier of digital content and decryption key
     */
    function checkAccessControl(address user, bytes32 documentId) external view returns (bool) {
        Token memory token = documentIdToToken[documentId];

        if (IERC1155(token.contractAddress).balanceOf(user, token.tokenId) > 0) {
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
    function grantAccessControlAndRegisterERC1155(
        bytes32 documentId,
        address erc1155Contract,
        uint256 tokenId
    ) public payable {
        IVWBLGateway(getGatewayAddress()).grantAccessControl{value: msg.value}(
            documentId,
            address(this),
            IVWBLERC1155(erc1155Contract).getMinter(tokenId)
        );

        documentIdToToken[documentId].contractAddress = erc1155Contract;
        documentIdToToken[documentId].tokenId = tokenId;

        emit erc1155DataRegistered(erc1155Contract, tokenId);
    }
}

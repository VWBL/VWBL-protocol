// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "../ERC1155/dependencies/IERC1155.sol";
import "../gateway/IVWBLGateway.sol";
import "./IAccessControlChecker.sol";
import "./IAccessControlCheckerByERC1155.sol";
import "../ERC1155/IVWBLERC1155.sol";

contract AccessControlCheckerByERC1155 is IAccessControlChecker, IAccessControlCheckerByERC1155, Ownable {
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

    function grantAccessControlAndRegisterERC1155(bytes32 documentId, address erc1155Contract, uint256 tokenId) public payable {
        IVWBLGateway(vwblGateway).grantAccessControl{value: msg.value}(documentId, address(this));
    
        documentIdToToken[documentId].contractAddress = erc1155Contract;
        documentIdToToken[documentId].tokenId = tokenId;

        emit erc1155DataRegistered(erc1155Contract, tokenId);
    }


    function setVWBLGateway(address newVWBLGateway) public onlyOwner {
        require(vwblGateway != newVWBLGateway);
        address oldVWBLGateway = vwblGateway;
        vwblGateway = newVWBLGateway;
        emit vwblGatewayChanged(oldVWBLGateway, newVWBLGateway);
    }
}
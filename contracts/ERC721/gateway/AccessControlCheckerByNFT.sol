// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "../IVWBL.sol";
import "./IVWBLGateway.sol";
import "./IAccessControlChecker.sol";

contract AccessControlCheckerByNFT is IAccessControlChecker {
    address public vwblGateway;
    
    constructor(address _vwblGateway) public {
        vwblGateway = _vwblGateway;
    }

    function checkAccessControl(
        address user, 
        bytes32 documentId
    ) external view returns (bool) {
        (address contractAddress, uint256 tokenId) = IVWBLGateway(vwblGateway).getToken(documentId);

        if (IERC721(contractAddress).ownerOf(tokenId) == user
            || IVWBL(contractAddress).getMinter(tokenId) == user
        ) {
            return true;
        }

        return false;
    } 
}
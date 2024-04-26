// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

contract TransferVWBLNFT {
    constructor() {}

    function transferNFT(
        address _contractAddress,
        address _to,
        uint256 _tokenId
    ) public {
        IERC721 targetNFTContract = IERC721(_contractAddress);
        require(targetNFTContract.ownerOf(_tokenId) == msg.sender, "You are not owner of token");
        bool approved = targetNFTContract.getApproved(_tokenId) == address(this);
        bool approvedForAll = targetNFTContract.isApprovedForAll(msg.sender, address(this));
        require(approved || approvedForAll, "Token is not approved yet");
        targetNFTContract.transferFrom(msg.sender, _to, _tokenId);
    }
}

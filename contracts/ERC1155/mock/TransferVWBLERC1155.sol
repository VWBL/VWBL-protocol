// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
import "../dependencies/IERC1155.sol";

contract TransferVWBLERC1155 {
    address public itemContractAddress;

    constructor(address _itemContractAddress) {
        itemContractAddress = _itemContractAddress;
    }

    function transferERC1155(address _to, uint256 _tokenId, uint256 _tokenAmount) public {
        require(
            IERC1155(itemContractAddress).balanceOf(msg.sender, _tokenId) >= _tokenAmount,
            "msg.sender doesn't have sufficient balance"
        );
        bool approvedForAll = IERC1155(itemContractAddress).isApprovedForAll(msg.sender, address(this));
        require(approvedForAll, "Token is not approved yet");
        
        IERC1155(itemContractAddress).safeTransferFrom(
            msg.sender,
            _to,
            _tokenId,
            _tokenAmount,
            ""
        );
    }

    function batchTransferERC1155(address _to, uint256[] memory _tokenIds, uint256[] memory _tokenAmounts) public {
        require(_tokenIds.length == _tokenAmounts.length, "Invalid array length");
        bool approvedForAll = IERC1155(itemContractAddress).isApprovedForAll(msg.sender, address(this));
        require(approvedForAll, "Token is not approved yet");
        for (uint32 i = 0; i < _tokenIds.length; i++) {
            require(
                IERC1155(itemContractAddress).balanceOf(msg.sender, _tokenIds[i]) >= _tokenAmounts[i],
                "msg.sender doesn't have sufficient balance"
            );
        }

        IERC1155(itemContractAddress).safeBatchTransferFrom(
            msg.sender,
            _to,
            _tokenIds,
            _tokenAmounts,
            ""
        );
    }
}
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/access/Ownable.sol";

contract ManageSoldEvent is Ownable {
    address[] private whiteListAddresses;

    event sold(uint256 sellPrice, uint256 tokenId, address from, address to, uint256 timestamp);
    event addedWhiteListAddress(address _address);
    event removedWhiteListAddress(address _address);

    modifier onlyWhitelist() {
        bool isWhitelist = false;
        for (uint32 i = 0; i < whiteListAddresses.length; i++) {
            if (msg.sender == whiteListAddresses[i]) {
                isWhitelist = true;
            }
        }
        require(isWhitelist, "msg.sender is not white listed address");
        _;
    }

    constructor(address _whiteListAddress) {
        whiteListAddresses.push(_whiteListAddress);
    }

    function emitSoldEvent(
        uint256 _sellPrice,
        uint256 _tokenId,
        address _from,
        address _to
    ) external onlyWhitelist {
        emit sold(_sellPrice, _tokenId, _from, _to, block.timestamp);
    }

    function getWhiteListAddresses() public view returns (address[] memory) {
        return whiteListAddresses;
    }

    function addWhiteListAddress(address _address) public onlyOwner {
        whiteListAddresses.push(_address);
        emit addedWhiteListAddress(_address);
    }

    function removeWhiteListAddress(address _address) public onlyOwner {
        uint256 length = whiteListAddresses.length;
        for (uint32 i = 0; i < length; i++) {
            if (_address == whiteListAddresses[i]) {
                whiteListAddresses[i] = whiteListAddresses[length - 1];
                delete whiteListAddresses[length - 1];
                emit removedWhiteListAddress(_address);
            }
        }
    }
}

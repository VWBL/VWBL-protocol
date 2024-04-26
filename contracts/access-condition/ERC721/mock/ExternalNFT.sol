// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract ExternalNFT is ERC721 {
    uint public counter = 0;
    constructor() ERC721("VWBL NFT", "VWBL") {}

    function mint(address minter) public returns (uint256) {
        _mint(minter, counter++);
        return counter;
    }

    function getMinter(uint256 tokenId) public view returns (address) {
        return address(0);
    }
}

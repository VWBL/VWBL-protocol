// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;
import "@openzeppelin/contracts/token/ERC721/presets/ERC721PresetMinterPauserAutoId.sol";

contract ExternalNFT is ERC721PresetMinterPauserAutoId {
    constructor() ERC721PresetMinterPauserAutoId("VWBL NFT", "VWBL", "http://xxx.zzz.com") {}

    function getMinter(uint256 tokenId) public view returns (address) {
        return address(0);
    }
}

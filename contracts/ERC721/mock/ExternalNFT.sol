//SPDX-License-Identifier: ISC
pragma solidity ^0.8.0;
import "@openzeppelin/contracts/token/ERC721/presets/ERC721PresetMinterPauserAutoId.sol";

contract ExternalNFT is ERC721PresetMinterPauserAutoId {
    constructor() ERC721PresetMinterPauserAutoId("VWBL NFT", "VWBL", "http://xxx.zzz.com") {}
}

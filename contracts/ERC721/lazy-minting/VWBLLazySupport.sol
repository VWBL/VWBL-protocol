// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
import "../VWBL.sol";

contract VWBLLazySupport is VWBL {
    constructor(
        string memory _baseURI,
        address _gatewayContract
    ) VWBL(_baseURI, _gatewayContract) {}

    function mint(address _minter, string memory _getKeyURl, uint256 _royaltiesPercentage) internal returns (uint256) {
        uint256 tokenId = ++counter;
        tokenIdToTokenInfo[tokenId].minterAddress = _minter;
        tokenIdToTokenInfo[tokenId].getKeyURl = _getKeyURl;
        _mint(_minter, tokenId);
        if (_royaltiesPercentage > 0) {
            _setRoyalty(tokenId, _minter, _royaltiesPercentage);
        }
        return tokenId;
    }
}

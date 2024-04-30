// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

import "./AbstractVWBLSettings.sol";

abstract contract AbstractVWBLToken is AbstractVWBLSettings {
    string public baseURI;
    uint256 public counter = 0;

    struct TokenInfo {
        bytes32 documentId;
        address minterAddress;
        string getKeyURl;
    }

    mapping(uint256 => TokenInfo) public tokenIdToTokenInfo;

    constructor(
        address _initialOwner,
        string memory _baseURI,
        address _gatewayProxy,
        address _accessCheckerContract,
        string memory _signMessage
    ) AbstractVWBLSettings(_initialOwner, _gatewayProxy, _accessCheckerContract, _signMessage) {
        baseURI = _baseURI;
    }

    /**
     * @notice Set BaseURI.
     * @param _baseURI new BaseURI
     */
    function setBaseURI(string memory _baseURI) public onlyOwner {
        baseURI = _baseURI;
    }

    /**
     * @notice Get minter of NFT by tokenId
     * @param tokenId The Identifier of NFT
     */
    function getMinter(uint256 tokenId) public view returns (address) {
        return tokenIdToTokenInfo[tokenId].minterAddress;
    }

    /**
     * @notice Get token Info for each minter
     * @param minter The address of NFT Minter
     */
    function getTokenByMinter(address minter) public view returns (uint256[] memory) {
        uint256 resultCount = 0;
        for (uint256 i = 1; i <= counter; i++) {
            if (tokenIdToTokenInfo[i].minterAddress == minter) {
                resultCount++;
            }
        }
        uint256[] memory tokens = new uint256[](resultCount);
        uint256 currentCounter = 0;
        for (uint256 i = 1; i <= counter; i++) {
            if (tokenIdToTokenInfo[i].minterAddress == minter) {
                tokens[currentCounter++] = i;
            }
        }
        return tokens;
    }
}

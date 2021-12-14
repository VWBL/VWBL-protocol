pragma solidity ^0.8.0;
import "https://github.com/OpenZeppelin/openzeppelin-contracts/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "https://github.com/OpenZeppelin/openzeppelin-contracts/contracts/access/Ownable.sol";

abstract contract VWBLProtocolLazySupport is ERC721Enumerable {
    struct TokenInfo {
        address minterAddress;
        string getKeyURl;
    }

    mapping(uint256 => TokenInfo) public tokenIdToTokenInfo;

    function transfer(address to, uint256 tokenId) public {
        _transfer(msg.sender, to, tokenId);
    }

    function safeTransfer(address to, uint256 tokenId) public {
        _safeTransfer(msg.sender, to, tokenId, "");
    }

    /// @dev This function is called by redeem function of VWBLLazyMinting contract.
    function mint(
        address to,
        uint256 tokenId,
        string memory _getKeyURl
    ) internal returns (uint256) {
        tokenIdToTokenInfo[tokenId].minterAddress = to;
        tokenIdToTokenInfo[tokenId].getKeyURl = _getKeyURl;
        _mint(to, tokenId);
        return tokenId;
    }

    /// @notice Returns whether NFT of tokenId is already minted.
    function checkMinted(uint256 tokenId) public view returns (bool) {
        if (tokenIdToTokenInfo[tokenId].minterAddress == address(0)) {
            return false;
        } else {
            return true;
        }
    }
}

contract VWBLLazySupport is VWBLProtocolLazySupport, Ownable {
    string public baseURI;

    constructor(string memory _baseURI) ERC721("VWBL", "VWBL") {
        baseURI = _baseURI;
    }

    function _baseURI() internal view override returns (string memory) {
        return baseURI;
    }

    function setBaseURI(string memory _baseURI) public onlyOwner {
        baseURI = _baseURI;
    }
}

pragma solidity ^0.8.0;
import "../VWBL.sol";

contract VWBLLazySupport is VWBL {
    address lazyMinter;
    address vwblLazyMinting;

    constructor(
        string memory _baseURI, 
        address _lazyMinter, 
        address _vwblLazyMinting
    ) VWBL(_baseURI) {
        lazyMinter = _lazyMinter;
        vwblLazyMinting = _vwblLazyMinting;
    }

    function mint(string memory _getKeyURl, uint256 _royaltiesPercentage) public override returns (uint256) {
        require(msg.sender == vwblLazyMinting, "This function is only called by VWBLLazyMinting contract");
        uint256 tokenId = ++counter;
        tokenIdToTokenInfo[tokenId].minterAddress = lazyMinter;
        tokenIdToTokenInfo[tokenId].getKeyURl = _getKeyURl;
        _mint(lazyMinter, tokenId);
        if (_royaltiesPercentage > 0) {
            _setRoyalty(tokenId, lazyMinter, _royaltiesPercentage);
        }
        return tokenId;
    }
}
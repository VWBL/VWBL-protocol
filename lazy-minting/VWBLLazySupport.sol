pragma solidity ^0.8.0;
import "../VWBL.sol";

contract VWBLLazySupport is VWBL {
    address minter;
    address vwblLazyMinting;

    constructor(string memory _baseURI, address _minter, address _vwblLazyMinting) 
        VWBL(_baseURI) {
            minter = _minter;
            vwblLazyMinting = _vwblLazyMinting;
    }

    function mint(string memory _getKeyURl) public override returns (uint256) {
        require(msg.sender == vwblLazyMinting, "This function is only called by VWBLLazyMinting contract");
        uint256 tokenId = ++counter;
        tokenIdToTokenInfo[tokenId].minterAddress = minter;
        tokenIdToTokenInfo[tokenId].getKeyURl = _getKeyURl;
        _mint(minter, tokenId);
        return tokenId;
    }
}
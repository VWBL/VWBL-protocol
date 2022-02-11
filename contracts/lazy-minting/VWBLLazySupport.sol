pragma solidity ^0.8.0;
import "../VWBL.sol";

contract VWBLLazySupport is VWBL {
    address vwblLazyMintingContract;

    constructor(
        string memory _baseURI,
        address _vwblLazyMintingContract
    ) VWBL(_baseURI) {
        vwblLazyMintingContract = _vwblLazyMintingContract;
    }

    function mint(address _minter, string memory _getKeyURl, uint256 _royaltiesPercentage) public override returns (uint256) {
        require(msg.sender == vwblLazyMintingContract, "msg.sender is invalid");
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

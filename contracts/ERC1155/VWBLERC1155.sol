// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./ERC1155Enumerable.sol";
import "./dependencies/IERC2981.sol";
import "./dependencies/IERC165.sol";
import "./dependencies/Ownable.sol";
import "../access-condition/IAccessControlCheckerByERC1155.sol";
import "../gateway/IVWBLGateway.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

contract VWBLERC1155 is IERC2981, Ownable, ERC1155Enumerable {
    using SafeMath for uint256;

    address public gatewayContract;
    address public accessCheckerContract;

    uint256 public counter = 0;
    
    struct TokenInfo {
        address minterAddress;
        string getKeyURl;
    }

    struct RoyaltyInfo {
        address recipient;
        uint256 royaltiesPercentage; // if percentage is 3.5, royaltiesPercentage=3.5*10^2 (decimal is 2)
    }

    mapping(uint256 => TokenInfo) public tokenIdToTokenInfo;
    mapping(uint256 => RoyaltyInfo) public tokenIdToRoyaltyInfo;

    uint public constant INVERSE_BASIS_POINT = 10000;

    event gatewayContractChanged(address oldGatewayContract, address newGatewayContract);
    event accessCheckerContractChanged(address oldAccessCheckerContract, address newAccessCheckerContract);

    constructor(
        string memory _baseURI,
        address _gatewayContract,
        address _accessCheckerContract
    ) ERC1155(_baseURI) {
        gatewayContract = _gatewayContract;
        accessCheckerContract = _accessCheckerContract;
    }

    function setBaseURI(string memory _baseURI) public onlyOwner {
        _setURI(_baseURI);
    }

    function setGatewayContract(address newGatewayContract) public onlyOwner {
        require(newGatewayContract != gatewayContract);
        address oldGatewayContract = gatewayContract;
        gatewayContract = newGatewayContract;

        emit gatewayContractChanged(oldGatewayContract, newGatewayContract);
    }

    function setAccessCheckerContract(address newAccessCheckerContract) public onlyOwner {
        require(newAccessCheckerContract != accessCheckerContract);
        address oldAccessCheckerContract = accessCheckerContract;
        accessCheckerContract = newAccessCheckerContract;

        emit accessCheckerContractChanged(oldAccessCheckerContract, newAccessCheckerContract);
    }

    function getFee() public view returns (uint256) {
        return IVWBLGateway(gatewayContract).feeWei();
    }

    function getMinter(uint256 tokenId) public view returns (address) {
        return tokenIdToTokenInfo[tokenId].minterAddress;
    }

    function mint(
        string memory _getKeyURl, 
        uint256 _amount, 
        uint256 _royaltiesPercentage, 
        bytes32 _documentId
    ) public payable returns (uint256) {
        uint256 tokenId = ++counter;
        tokenIdToTokenInfo[tokenId].minterAddress = msg.sender;
        tokenIdToTokenInfo[tokenId].getKeyURl = _getKeyURl;
        _mint(msg.sender, tokenId, _amount, "");
        if (_royaltiesPercentage > 0) {
            _setRoyalty(tokenId, msg.sender, _royaltiesPercentage);
        }

        IAccessControlCheckerByERC1155(accessCheckerContract).grantAccessControlAndRegisterERC1155{value: msg.value}(
            _documentId,
            address(this),
            tokenId
        );

        return tokenId;
    }

    function mintBatch(
        string memory _getKeyUrl, 
        uint256[] memory _amounts, 
        uint256[] memory _royaltiesPercentages,
        bytes32[] memory _documentIds
    ) public payable {
        require(
            _amounts.length == _royaltiesPercentages.length 
            && _royaltiesPercentages.length == _documentIds.length,
            "Invalid array length"
        );

        uint256[] memory tokenIds = new uint256[](_amounts.length);
        for (uint32 i = 0; i < _amounts.length; i++) {
            uint256 tokenId = ++counter;
            tokenIds[i] = tokenId;
            tokenIdToTokenInfo[tokenId].minterAddress = msg.sender;
            tokenIdToTokenInfo[tokenId].getKeyURl = _getKeyUrl;
            if (_royaltiesPercentages[i] > 0) {
                _setRoyalty(tokenId, msg.sender, _royaltiesPercentages[i]);
            } 
        }

        _mintBatch(msg.sender, tokenIds, _amounts, "");

        (bool calResult, uint256 fee) = msg.value.tryDiv(_amounts.length);
        require(calResult, "Calculation error of div");
        for (uint32 i = 0; i < _amounts.length; i++) {
            IAccessControlCheckerByERC1155(accessCheckerContract).grantAccessControlAndRegisterERC1155{value: fee}(
                _documentIds[i],
                address(this),
                tokenIds[i]
            );
        }
    }

    function getTokenByMinter(address minter)
        public
        view
        returns (TokenInfo[] memory)
    {
        uint256 currentCounter = 0;
        TokenInfo[] memory tokens = new TokenInfo[](counter);
        for (uint256 i = 1; i <= counter; i++) {
            if (tokenIdToTokenInfo[i].minterAddress == minter) {
                tokens[currentCounter++] = tokenIdToTokenInfo[i];
            }
        }
        return tokens;
    }

    function supportsInterface(bytes4 interfaceId) public view 
        virtual override(IERC165, ERC1155) returns (bool) {
        return interfaceId == type(IERC2981).interfaceId
            || super.supportsInterface(interfaceId);
    }

    function royaltyInfo(uint256 _tokenId, uint256 _salePrice)
        external
        view
        override
        returns (address receiver, uint256 royaltyAmount)
    {
        RoyaltyInfo memory royaltyInfo = tokenIdToRoyaltyInfo[_tokenId];
        uint256 _royalties = (_salePrice * royaltyInfo.royaltiesPercentage) / INVERSE_BASIS_POINT;
        return (royaltyInfo.recipient, _royalties);
    }

    function _setRoyalty(
        uint256 _tokenId,
        address _recipient,
        uint256 _royaltiesPercentage
    ) private {
        RoyaltyInfo storage royaltyInfo = tokenIdToRoyaltyInfo[_tokenId];
        royaltyInfo.recipient = _recipient;
        royaltyInfo.royaltiesPercentage = _royaltiesPercentage;
    }
}
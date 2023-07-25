// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/common/ERC2981.sol";

import "./IAccessControlCheckerByNFT.sol";
import "../AbstractVWBLSettings.sol";

/**
 * @dev NFT which is added Viewable features that only NFT Owner can view digital content
 */
contract VWBLERC721ERC2981 is Ownable, AbstractVWBLSettings, ERC721Enumerable, ERC2981 {
    string public baseURI;
    address public accessCheckerContract;
    uint256 public counter = 0;

    struct TokenInfo {
        bytes32 documentId;
        address minterAddress;
        string getKeyURl;
    }

    mapping(uint256 => TokenInfo) public tokenIdToTokenInfo;

    event accessCheckerContractChanged(address oldAccessCheckerContract, address newAccessCheckerContract);

    constructor(
        string memory _baseURI,
        address _gatewayProxy,
        address _accessCheckerContract,
        string memory _signMessage
    ) ERC721("VWBL", "VWBL") AbstractVWBLSettings(_gatewayProxy, _signMessage) {
        baseURI = _baseURI;
        accessCheckerContract = _accessCheckerContract;
    }

    /**
     * @notice BaseURI for computing {tokenURI}.
     */
    function _baseURI() internal view override returns (string memory) {
        return baseURI;
    }

    /**
     * @notice Set BaseURI.
     * @param _baseURI new BaseURI
     */
    function setBaseURI(string memory _baseURI) public onlyOwner {
        baseURI = _baseURI;
    }

    /**
     * @notice Set new access condition contract address
     * @param newAccessCheckerContract The contract address of new access condition contract
     */
    function setAccessCheckerContract(address newAccessCheckerContract) public onlyOwner {
        require(newAccessCheckerContract != accessCheckerContract);
        address oldAccessCheckerContract = accessCheckerContract;
        accessCheckerContract = newAccessCheckerContract;

        emit accessCheckerContractChanged(oldAccessCheckerContract, newAccessCheckerContract);
    }

    /**
     * @notice Mint NFT, grant access feature and register access condition of digital content.
     * @param _getKeyURl The URl of VWBL Network(Key management network)
     * @param _feeNumerator Royalty of NFT
     * @param _documentId The Identifier of digital content and decryption key
     */
    function mint(
        string memory _getKeyURl,
        uint96 _feeNumerator,
        bytes32 _documentId
    ) public payable returns (uint256) {
        uint256 tokenId = ++counter;
        TokenInfo memory tokenInfo = TokenInfo(_documentId, msg.sender, _getKeyURl);
        tokenIdToTokenInfo[tokenId] = tokenInfo;
        _mint(msg.sender, tokenId);
        if (_feeNumerator > 0) {
            _setTokenRoyalty(tokenId, msg.sender, _feeNumerator);
        }

        // grant access control to nft and pay vwbl fee and register nft data to access control checker contract
        IAccessControlCheckerByNFT(accessCheckerContract).grantAccessControlAndRegisterNFT{value: msg.value}(
            _documentId,
            address(this),
            tokenId
        );

        return tokenId;
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

    /**
     * @dev See {IERC165-supportsInterface}.
     */
    function supportsInterface(bytes4 interfaceId)
        public
        view
        virtual
        override(ERC721Enumerable, ERC2981)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}

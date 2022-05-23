pragma solidity ^0.8.0;
pragma abicoder v2; // required to accept structs as function parameters

import "@openzeppelin/contracts/utils/cryptography/draft-EIP712.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "./VWBLLazySupport.sol";

contract EIP712Adaptor is EIP712, AccessControl, VWBLLazySupport {
    bytes32 public constant SIGNER_ROLE = keccak256("SIGNER_ROLE");
    string private constant SIGNING_DOMAIN = "LazyNFT-Voucher";
    string private constant SIGNATURE_VERSION = "1";

    constructor(address _signer, string memory _baseURI, address _gatewayContract) 
        VWBLLazySupport(_baseURI, _gatewayContract)
        EIP712(SIGNING_DOMAIN, SIGNATURE_VERSION)
    {
        _setupRole(SIGNER_ROLE, _signer);
    }

    /// @notice Represents an un-minted NFT, which has not yet been recorded into the blockchain. A signed voucher can be redeemed for a real NFT using the redeem function.
    struct NFTVoucher {
        // @notice The address who NFT minted.
        address minter;
        // @notice The id of unencrypted document
        bytes32 documentId;
        // @notice The random string of the token to be redeemed. Must be unique - if another token with this randomString already exists, the redeem function will revert.
        string randomString;
        // @notice The sell price (in wei) which sold at vwbl offchain marketing/auction
        uint256 sellPrice;
        // @notice The metadata URI to associate with this token.
        string uri;
        // @notice Percentage of each sale to pay as royalties.
        uint256 royaltiesPercentage;
        // @notice The contract address to emit sold event
        address emitSoldEventContract;
        // @notice the EIP-712 signature of all other fields in the NFTVoucher struct. For a voucher to be valid, it must be signed by an account with the SIGNER_ROLE.
        bytes signature;
    }

    /// @notice Returns a hash of the given NFTVoucher, prepared using EIP712 typed data hashing rules.
    /// @param voucher An NFTVoucher to hash.
    function _hash(NFTVoucher calldata voucher) internal view returns (bytes32) {
        return
            _hashTypedDataV4(
                keccak256(
                    abi.encode(
                        keccak256(
                            "NFTVoucher(address minter,bytes32 documentId,string randomString,uint256 sellPrice,string uri,uint256 royaltiesPercentage,address emitSoldEventContract)"
                        ),
                        voucher.minter,
                        voucher.documentId,
                        keccak256(bytes(voucher.randomString)),
                        voucher.sellPrice,
                        keccak256(bytes(voucher.uri)),
                        voucher.royaltiesPercentage,
                        voucher.emitSoldEventContract
                    )
                )
            );
    }

    /// @notice Returns the chain id of the current blockchain.
    /// @dev This is used to workaround an issue with ganache returning different values from the on-chain chainid() function and
    ///  the eth_chainId RPC method. See https://github.com/protocol/nft-website/issues/121 for context.
    function getChainID() external view returns (uint256) {
        uint256 id;
        assembly {
            id := chainid()
        }
        return id;
    }

    /// @notice Verifies the signature for a given NFTVoucher, returning the address of the signer.
    /// @dev Will revert if the signature is invalid. Does not verify that the signer is authorized to mint NFTs.
    /// @param voucher An NFTVoucher describing an unminted NFT.
    function _verify(NFTVoucher calldata voucher) internal view returns (address) {
        bytes32 digest = _hash(voucher);
        return ECDSA.recover(digest, voucher.signature);
    }

    function supportsInterface(bytes4 interfaceId) public view
        virtual override(AccessControl, VWBLProtocol) returns (bool) {
            return AccessControl.supportsInterface(interfaceId) ||
                super.supportsInterface(interfaceId);
    }
}

pragma solidity ^0.8.0;
pragma abicoder v2; // required to accept structs as function parameters

import "https://github.com/OpenZeppelin/openzeppelin-contracts/contracts/utils/cryptography/draft-EIP712.sol";
import "https://github.com/OpenZeppelin/openzeppelin-contracts/contracts/utils/cryptography/ECDSA.sol";
import "https://github.com/OpenZeppelin/openzeppelin-contracts/contracts/access/AccessControl.sol";
import "./VWBLLazySupport.sol";

contract VWBLLazyMinting is EIP712, AccessControl, VWBLLazySupport {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    string private constant SIGNING_DOMAIN = "LazyNFT-Voucher";
    string private constant SIGNATURE_VERSION = "1";
    string[] public randomStringArray;

    mapping(address => uint256) public pendingWithdrawals;

    constructor(address payable _minter, string memory _baseURI)
        VWBLLazySupport(_baseURI, _minter, address(this))
        EIP712(SIGNING_DOMAIN, SIGNATURE_VERSION)
    {
        _setupRole(MINTER_ROLE, _minter);
    }

    /// @notice Represents an un-minted NFT, which has not yet been recorded into the blockchain. A signed voucher can be redeemed for a real NFT using the redeem function.
    struct NFTVoucher {
        // @notice The random string of the token to be redeemed. Must be unique - if another token with this randomString already exists, the redeem function will revert.
        string randomString;
        // @notice The minimum price (in wei) that the NFT creator is willing to accept for the initial sale of this NFT.
        uint256 minPrice;
        // @notice The metadata URI to associate with this token.
        string uri;
        // @notice Percentage of each sale to pay as royalties
        uint256 royaltiesPercentage;
        // @notice the EIP-712 signature of all other fields in the NFTVoucher struct. For a voucher to be valid, it must be signed by an account with the MINTER_ROLE.
        bytes signature;
    }

    /// @notice Redeems an NFTVoucher for an actual NFT, creating it in the process.
    /// @param redeemer The address of the account which will receive the NFT upon success.
    /// @param voucher A signed NFTVoucher that describes the NFT to be redeemed.
    function redeem(address redeemer, NFTVoucher calldata voucher) public payable returns (uint256) {
        // make sure signature is valid and get the address of the signer
        address signer = _verify(voucher);

        // make sure that the signer is authorized to mint NFTs
        require(
            hasRole(MINTER_ROLE, signer),
            "Signature invalid or unauthorized"
        );

        // make sure that the redeemer is paying enough to cover the buyer's cost
        require(msg.value >= voucher.minPrice, "Insufficient funds to redeem");

        // make sure that the randomString of token is not minted
        bool alreadyMinted = mintedRandomstring(voucher.randomString);
        require(alreadyMinted == false, "The randomString of token is already minted");

        // first assign the token to the signer, to establish provenance on-chain
        mint(voucher.uri, voucher.royaltiesPercentage);

        // transfer the token to the redeemer
        _transfer(signer, redeemer, counter);

        // push randomString to array
        randomStringArray.push(voucher.randomString);

        // record payment to signer's withdrawal balance
        pendingWithdrawals[signer] += msg.value;

        return counter;
    }

    /// @notice Transfers all pending withdrawal balance to the caller. Reverts if the caller is not an authorized minter.
    function withdraw() public {
        require(
            hasRole(MINTER_ROLE, msg.sender),
            "Only authorized minters can withdraw"
        );

        // IMPORTANT: casting msg.sender to a payable address is only safe if ALL members of the minter role are payable addresses.
        address payable receiver = payable(msg.sender);

        uint256 amount = pendingWithdrawals[receiver];
        // zero account before transfer to prevent re-entrancy attack
        pendingWithdrawals[receiver] = 0;
        receiver.transfer(amount);
    }

    /// @notice Retuns the amount of Ether available to the caller to withdraw.
    function availableToWithdraw() public view returns (uint256) {
        return pendingWithdrawals[msg.sender];
    }

    /// @notice Returns a hash of the given NFTVoucher, prepared using EIP712 typed data hashing rules.
    /// @param voucher An NFTVoucher to hash.
    function _hash(NFTVoucher calldata voucher) internal view returns (bytes32) {
        return
            _hashTypedDataV4(
                keccak256(
                    abi.encode(
                        keccak256(
                            "NFTVoucher(string randomString,uint256 minPrice,string uri,uint256 royaltiesPercentage)"
                        ),
                        voucher.randomString,
                        voucher.minPrice,
                        keccak256(bytes(voucher.uri)),
                        voucher.royaltiesPercentage
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

    function mintedRandomstring(string memory randomString) public view returns (bool) {
        for (uint32 i = 0; i < randomStringArray.length; i++) {
            if (hashCompareWithLengthCheck(randomString, randomStringArray[i])) {
                return true;
            }
        }
        return false;
    }

    function hashCompareWithLengthCheck(string memory a, string memory b) private pure returns (bool) {
        if(bytes(a).length != bytes(b).length) {
            return false;
        } else {
            return keccak256(abi.encodePacked(a)) == keccak256(abi.encodePacked(b));
        }
    }
}
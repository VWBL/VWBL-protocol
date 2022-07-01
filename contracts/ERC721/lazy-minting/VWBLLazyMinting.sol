// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
pragma abicoder v2; // required to accept structs as function parameters

import "./EIP712Adaptor.sol";
import "../gateway/IAccessControlCheckerByNFT.sol";
import "../gateway/IVWBLGateway.sol";
import "./IVWBLMarket.sol";

contract VWBLLazyMinting is EIP712Adaptor {
    mapping(address => uint256) public pendingWithdrawals;
    string[] public randomStringArray;

    constructor(
        address _signer, 
        string memory _baseURI, 
        address _gatewayContract,
        address _accessCheckerContract
    ) EIP712Adaptor(_signer, _baseURI, _gatewayContract, _accessCheckerContract) {}

    /// @notice Redeems an NFTVoucher for an actual NFT, creating it in the process.
    /// @param redeemer The address of the account which will receive the NFT upon success.
    /// @param voucher A signed NFTVoucher that describes the NFT to be redeemed.
    function redeem(address redeemer, NFTVoucher calldata voucher) public payable returns (uint256) {
        // make sure signature is valid and get the address of the signer
        address signer = _verify(voucher);

        // make sure that the signer is authorized to mint NFTs
        require(
            hasRole(SIGNER_ROLE, signer),
            "Invalid Signature"
        );

        uint256 vwblFeeAmount = getFee();
        // make sure that the redeemer is paying enough to cover the buyer's cost
        require(msg.value == voucher.sellPrice + vwblFeeAmount, "Insufficient funds to redeem");

        // make sure that the randomString of token is not minted
        bool alreadyMinted = mintedRandomstring(voucher.randomString);
        require(alreadyMinted == false, "Already minted");

        // first assign the token to the minter, to establish provenance on-chain
        uint256 tokenId = mint(voucher.minter, voucher.uri, voucher.royaltiesPercentage);

        // transfer the token to the redeemer
        _transfer(voucher.minter, redeemer, counter);

        // push randomString to array
        randomStringArray.push(voucher.randomString);

        // record payment to minter's withdrawal balance
        pendingWithdrawals[voucher.minter] += msg.value - vwblFeeAmount;

        // grant access control to nft and pay vwbl fee and register nft data to access control checker contract
        IAccessControlCheckerByNFT(accessCheckerContract).grantAccessControlAndRegisterNFT{value: vwblFeeAmount}(voucher.documentId,address(this), tokenId);

        // emit sell event
        IVWBLMarket(voucher.emitSoldEventContract).emitSoldEvent(
            voucher.sellPrice, 
            tokenId,
            voucher.minter, 
            redeemer
        );

        return counter;
    }

    /// @notice Transfers all pending withdrawal balance to the caller. Reverts if the caller is not an authorized minter.
    function withdraw() public {
        //IMPORTANT: casting msg.sender to a payable address is only safe if ALL members of the minter role are payable addresses.
        address payable minter = payable(msg.sender);

        uint256 amount = pendingWithdrawals[minter];
        // zero account before transfer to prevent re-entrancy attack
        pendingWithdrawals[minter] = 0;
        minter.transfer(amount);
    }

    /// @notice Retuns the amount of Ether available to the caller to withdraw.
    function availableToWithdraw() public view returns (uint256) {
        return pendingWithdrawals[msg.sender];
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

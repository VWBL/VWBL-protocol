// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./AllocateVWBLFee.sol";
import "../gateway/utils/IWithdrawExtraFee.sol";

contract VWBLContractWallet is AllocateVWBLFee, AccessControl {
    bytes32 public immutable SET_FEE_ROLE = keccak256("SET_FEE_ROLE");
    bytes32 public immutable OPERATOR_ROLE = keccak256("OPERATOR_ROLE");
    address[] public ownedContracts;
    address public withdrawExtraFeeAddress;

    constructor(
        address[] memory _owners,
        uint _required,
        address _gatewayV1Address,
        address _gatewayV2Address,
        address _scFeeRegistryAddress,
        address _vwblFeeSetterAddress,
        address _withdrawExtraFeeAddress
    ) AllocateVWBLFee(_owners, _required, _gatewayV1Address, _gatewayV2Address, _scFeeRegistryAddress) {
        // set `admin role`
        _grantRole(DEFAULT_ADMIN_ROLE, address(this));
        _setRoleAdmin(DEFAULT_ADMIN_ROLE, DEFAULT_ADMIN_ROLE);
        // set `set fee role`
        _grantRole(SET_FEE_ROLE, _vwblFeeSetterAddress);
        _setRoleAdmin(SET_FEE_ROLE, DEFAULT_ADMIN_ROLE);
        // set `operator role`
        _grantRole(OPERATOR_ROLE, msg.sender);
        _setRoleAdmin(OPERATOR_ROLE, DEFAULT_ADMIN_ROLE);

        withdrawExtraFeeAddress = _withdrawExtraFeeAddress;
    }

    /**
     * @notice Returns the array of contract addresses owned by the VWBL Contract Wallet.
     * @return An array of contract addresses owned by the VWBL Contract Wallet.
     */
    function getOwnedContracts() public view returns (address[] memory) {
        return ownedContracts;
    }

    /**
     * @notice Registers a new contract address owned by the VWBL Contract Wallet.
     * @param ownedContractAddress The address of the contract to be registered as owned by the VWBL Contract Wallet.
     */
    function registerOwnedContract(address ownedContractAddress) public {
        require(hasRole(OPERATOR_ROLE, msg.sender), "msg sender doesn't have OPERATOR_ROLE");
        require(Ownable(ownedContractAddress).owner() == address(this), "VWBL Contract Wallet isn't owner");
        for (uint i = 0; i < ownedContracts.length; i++) {
            require(ownedContracts[i] != ownedContractAddress, "This contract is already registered");
        }

        ownedContracts.push(ownedContractAddress);
    }

    /**
     * @notice Transfers ownership of all owned contracts to a new owner.
     * @param newOwner The address of the new owner to transfer ownership to.
     */
    function transferOwnerships(address newOwner) public onlyMultiSigWallet {
        for (uint i = 0; i < ownedContracts.length; i++) {
            Ownable(ownedContracts[i]).transferOwnership(newOwner);
        }
    }

    /**
     * @notice Sets the fee for the native token in Wei to Gateway Contract.
     * @param newFeeWei The new fee amount to be set.
     * @return The new fee amount in Wei.
     */
    function setNativeTokenFee(uint256 newFeeWei) public returns (uint256) {
        require(hasRole(SET_FEE_ROLE, msg.sender), "msg sender doesn't have SET_FEE_ROLE");
        IVWBLGatewayV2(gatewayV2Address).setFeeWei(newFeeWei);
        IVWBLGateway(gatewayV1Address).setFeeWei(newFeeWei);
        return newFeeWei;
    }

    /**
     * @notice Registers a new fee numerator for a specific stable coin to StableCoinFeeRegistry Contract.
     * @param fiatIndex The index of the stable coin to register the fee numerator for.
     * @param newFeeNumerator The new fee numerator denominated in fiat currency to register.
     */
    function setStableCoinFee(uint fiatIndex, uint newFeeNumerator) public returns (uint256) {
        require(hasRole(SET_FEE_ROLE, msg.sender), "msg sender doesn't have SET_FEE_ROLE");
        IStableCoinFeeRegistry(scFeeRegistryAddress).registerFeeNumerator(fiatIndex, newFeeNumerator);
        return newFeeNumerator;
    }

    /**
     * @notice Registers information about a new stable coin to StableCoinFeeRegistry Contract.
     * @param _fiatName The name of fiat currency.
     * @param _erc20Addresses The list of ERC20 addresses representing the stable coin.
     * @param _feeNumerator The fee numerator denominated in fiat currency.
     */
    function registerStableCoinInfo(string memory _fiatName, address[] memory _erc20Addresses, uint _feeNumerator) public {
        require(hasRole(OPERATOR_ROLE, msg.sender), "msg sender doesn't have OPERATOR_ROLE");
        IStableCoinFeeRegistry(scFeeRegistryAddress).registerStableCoinInfo(_fiatName, _erc20Addresses, _feeNumerator);
    }

    /**
     * @notice Renames the fiat currency associated with a specific fiat index to StableCoinFeeRegistry Contract.
     * @param fiatIndex The index of the fiat currency to be renamed.
     * @param newFiatName The new name for the fiat currency.
     */
    function renameFiat(uint fiatIndex, string memory newFiatName) public {
        require(hasRole(OPERATOR_ROLE, msg.sender), "msg sender doesn't have OPERATOR_ROLE");
        IStableCoinFeeRegistry(scFeeRegistryAddress).renameFiat(fiatIndex, newFiatName);
    }

    /**
     * @notice Registers new ERC20 addresses for a specific stable coin to StableCoinFeeRegistry Contract.
     * @param fiatIndex The index of the stable coin to register the ERC20 addresses for.
     * @param newERC20Addresses The list of new ERC20 addresses to register.
     */
    function registerERC20Addresses(uint fiatIndex, address[] memory newERC20Addresses) public {
        require(hasRole(OPERATOR_ROLE, msg.sender), "msg sender doesn't have OPERATOR_ROLE");
        IStableCoinFeeRegistry(scFeeRegistryAddress).registerERC20Addresses(fiatIndex, newERC20Addresses);
    }

    /**
     * @notice Unregisters an ERC20 address for a specific stable coin to StableCoinFeeRegistry Contract.
     * @param fiatIndex The index of the stable coin to unregister the ERC20 address from.
     * @param erc20Address The address of the ERC20 token to unregister.
     */
    function unregisterERC20Address(uint fiatIndex, address erc20Address) public {
        require(hasRole(OPERATOR_ROLE, msg.sender), "msg sender doesn't have OPERATOR_ROLE");
        IStableCoinFeeRegistry(scFeeRegistryAddress).unregisterERC20Address(fiatIndex, erc20Address);
    }

    /**
     * @notice Sets the recipient address for a specified source address.
     * @param srcAddress The address who call payFee method of VWBLGatewayV2 contract.
     * @param recipient The address to set as the recipient for the specified source address.
     */
    function setRecipient(address srcAddress, address recipient) public {
        require(hasRole(OPERATOR_ROLE, msg.sender), "msg sender doesn't have OPERATOR_ROLE");
        IWithdrawExtraFee(withdrawExtraFeeAddress).setRecipient(srcAddress, recipient);
    }

    /**
     * @notice Set new address of Stable Coin Fee Registry contract
     * @param newScFeeRegistryAddress The new address of the Stable Coin Fee Registry contract
     */
    function setStableCoinFeeRegistry(address newScFeeRegistryAddress) public {
        require(hasRole(OPERATOR_ROLE, msg.sender), "msg sender doesn't have OPERATOR_ROLE");
        require(newScFeeRegistryAddress != scFeeRegistryAddress);
        address oldSCFeeRegistryAddress = scFeeRegistryAddress;
        scFeeRegistryAddress = newScFeeRegistryAddress;

        emit stableCoinFeeRegistryChanged(oldSCFeeRegistryAddress, newScFeeRegistryAddress);
    }
}
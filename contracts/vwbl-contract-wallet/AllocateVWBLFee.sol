// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./ValidatorRegistry.sol";
import "../gateway/IVWBLGatewayV2.sol";
import "../gateway/legacy/VWBLGateway.sol";
import "../gateway/utils/IStableCoinFeeRegistry.sol";

contract AllocateVWBLFee is ValidatorRegistry, ReentrancyGuard {
    address public gatewayV1Address;
    address public gatewayV2Address;
    address public scFeeRegistryAddress;

    uint256 public totalPendingFeeWei;
    mapping(address => uint256) public validatorToPendingFeeWei;

    mapping(address => uint256) public erc20ToTotalPendingFeeDecimals;
    // validator address => erc20 address => pending fee decimals
    mapping(address => mapping(address => uint256)) public validatorToPendingFeeDecimals;

    event nativeTokenFeeAllocatedAmount(address validator, uint256 amount);
    event erc20FeeAllocatedAmount(address validator, address erc20, uint256 amount);
    event stableCoinFeeRegistryChanged(address oldSCFeeRegistry, address newSCFeeRegistry);

    constructor(
        address[] memory _owners,
        uint256 _required,
        address _gatewayV1Address,
        address _gatewayV2Address,
        address _scFeeRegistryAddress
    ) ValidatorRegistry(_owners, _required) {
        gatewayV1Address = _gatewayV1Address;
        gatewayV2Address = _gatewayV2Address;
        scFeeRegistryAddress = _scFeeRegistryAddress;
    }

    /**
     * @notice Validator withdraw all pending amount of a native and ERC20 token.
     * @param recipient The address of the recipient.
     */
    function withdrawAllPendingToken(address recipient) public nonReentrant {
        uint256 pendingNativeAmount = validatorToPendingFeeWei[msg.sender];
        if (pendingNativeAmount > 0) {
            validatorToPendingFeeWei[msg.sender] = 0;
            totalPendingFeeWei -= pendingNativeAmount;
            payable(recipient).transfer(pendingNativeAmount);
        }

        address[] memory prevAndCurRegisteredTokens = IStableCoinFeeRegistry(scFeeRegistryAddress)
            .getPrevAndCurRegisteredTokens();
        for (uint256 i = 0; i < prevAndCurRegisteredTokens.length; i++) {
            uint256 pendingERC20Amount = validatorToPendingFeeDecimals[msg.sender][prevAndCurRegisteredTokens[i]];
            if (pendingERC20Amount > 0) {
                validatorToPendingFeeDecimals[msg.sender][prevAndCurRegisteredTokens[i]] = 0;
                erc20ToTotalPendingFeeDecimals[prevAndCurRegisteredTokens[i]] -= pendingERC20Amount;
                IERC20(prevAndCurRegisteredTokens[i]).transfer(recipient, pendingERC20Amount);
            }
        }
    }

    /**
     * @notice Validator withdraw specified amount of a pending native and ERC20 token.
     * @param recipient The address of the recipient.
     * @param withdrawNativeAmount The amount of native tokens to withdraw.
     * @param erc20Addresses An array of ERC20 token addresses.
     * @param withdrawERC20Amounts An array of amounts of ERC20 tokens to withdraw.
     */
    function withdrawPendingToken(
        address recipient,
        uint256 withdrawNativeAmount,
        address[] memory erc20Addresses,
        uint256[] memory withdrawERC20Amounts
    ) public nonReentrant {
        require(
            validatorToPendingFeeWei[msg.sender] >= withdrawNativeAmount,
            "Insufficient native token fee balance for withdrawal"
        );
        require(erc20Addresses.length == withdrawERC20Amounts.length, "Invalid array length");
        for (uint256 i = 0; i < erc20Addresses.length; i++) {
            require(
                validatorToPendingFeeDecimals[msg.sender][erc20Addresses[i]] >= withdrawERC20Amounts[i],
                "Insufficient ERC20 token fee balance for withdrawal"
            );
        }

        if (withdrawNativeAmount > 0) {
            validatorToPendingFeeWei[msg.sender] -= withdrawNativeAmount;
            totalPendingFeeWei -= withdrawNativeAmount;
            payable(recipient).transfer(withdrawNativeAmount);
        }

        for (uint256 i = 0; i < erc20Addresses.length; i++) {
            validatorToPendingFeeDecimals[msg.sender][erc20Addresses[i]] -= withdrawERC20Amounts[i];
            erc20ToTotalPendingFeeDecimals[erc20Addresses[i]] -= withdrawERC20Amounts[i];
            IERC20(erc20Addresses[i]).transfer(recipient, withdrawERC20Amounts[i]);
        }
    }

    /**
     * @notice Allocates VWBL fees to validators.
     * @dev This function is responsible for allocating both native token fees and ERC20 token fees to validators.
     *      This function can only be called by the multisig wallet contract itself.
     */
    function allocateVWBLFeeToValidator() public onlyMultiSigWallet {
        allocateNativeTokenToValidator();
        allocateERC20ToValidator();
    }

    /**
     * @dev Allocates native token fees to validators based on their allocation numerators.
     */
    function allocateNativeTokenToValidator() private {
        uint256 nativeWithdrawalAmount = withdrawNativeTokenFromGateway();
        for (uint256 i = 0; i < activeValidators.length; i++) {
            uint256 allocateAmount = (nativeWithdrawalAmount * validatorToAllocationNumerator[activeValidators[i]]) /
                _allocationDenominator();
            validatorToPendingFeeWei[activeValidators[i]] += allocateAmount;
            emit nativeTokenFeeAllocatedAmount(activeValidators[i], allocateAmount);
        }
        totalPendingFeeWei += nativeWithdrawalAmount;
    }

    /**
     * @dev Withdraws native token fees from both Gateway V1 and Gateway V2 contracts.
     * @return The total withdrawn amount of native token fees from both Gateway V1 and Gateway V2.
     */
    function withdrawNativeTokenFromGateway() private returns (uint256) {
        uint256 pendingFeeWeiOnGatewayV1 = getPendingFeeWeiOnGatway(gatewayV1Address);
        if (pendingFeeWeiOnGatewayV1 > 0) {
            IVWBLGatewayV2(gatewayV1Address).withdrawFee();
        }
        uint256 pendingFeeWeiOnGatewayV2 = getPendingFeeWeiOnGatway(gatewayV2Address);
        if (pendingFeeWeiOnGatewayV2 > 0) {
            IVWBLGatewayV2(gatewayV2Address).withdrawFee();
        }
        return pendingFeeWeiOnGatewayV1 + pendingFeeWeiOnGatewayV2;
    }

    /**
     * @notice Returns the pending fee amount in Wei on the specified Gateway contract.
     * @param gatewayAddress The address of the Gateway contract to check.
     * @return The pending fee amount in Wei on the specified Gateway contract.
     */
    function getPendingFeeWeiOnGatway(address gatewayAddress) public view returns (uint256) {
        VWBLGateway gatewayCotract = VWBLGateway(gatewayAddress);
        return gatewayCotract.pendingFee();
    }

    /**
     * @dev Allocates ERC20 token fees to validators based on their allocation numerators.
     */
    function allocateERC20ToValidator() private {
        (address[] memory prevAndCurRegisteredTokens, uint256[] memory erc20WithdrawalAmounts) = IVWBLGatewayV2(
            gatewayV2Address
        ).withdrawERC20Fee();
        for (uint256 i = 0; i < prevAndCurRegisteredTokens.length; i++) {
            if (erc20WithdrawalAmounts[i] > 0) {
                for (uint256 j = 0; j < activeValidators.length; j++) {
                    uint256 allocateAmount = (erc20WithdrawalAmounts[i] *
                        validatorToAllocationNumerator[activeValidators[j]]) / _allocationDenominator();
                    validatorToPendingFeeDecimals[activeValidators[j]][prevAndCurRegisteredTokens[i]] += allocateAmount;
                    emit erc20FeeAllocatedAmount(activeValidators[j], prevAndCurRegisteredTokens[i], allocateAmount);
                }
                erc20ToTotalPendingFeeDecimals[prevAndCurRegisteredTokens[i]] += erc20WithdrawalAmounts[i];
            }
        }
    }
}
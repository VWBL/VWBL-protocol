pragma solidity ^0.8.20;

import "./ValidatorRegistry.sol";
import "../IVWBLGatewayV2.sol";
import "../legacy/VWBLGateway.sol";
import "./IERC20FeeRegistry.sol";

contract VWBLContractWallet is ValidatorRegistry {
    address public gatewayV1Address;
    address public gatewayV2Address;

    uint256 public totalPendingFeeWei;
    mapping (address => uint256) public validatorToPendingFeeWei;

    mapping (address => uint256) public erc20ToTotalPendingFeeDecimals;
    // validator address => erc20 address => pending fee decimals
    mapping (address => mapping(address => uint256)) public validatorToPendingFeeDecimals;

    event NativeTokenFeeAllocatedAmount(address validator, uint256 amount);
    event ERC20FeeAllocatedAmount(address validator, address erc20, uint256 amount);

    constructor(
        address[] memory _owners,
        uint _required,
        address _gatewayV1Address,
        address _gatewayV2Address
    ) ValidatorRegistry(_owners, _required) {
        gatewayV1Address = _gatewayV1Address;
        gatewayV2Address = _gatewayV2Address;
    }

    function allocateVWBLFeeToValidator() public onlyWallet {
        allocateNativeTokenToValidator();
        allocateERC20ToValidator();
    }

    function allocateNativeTokenToValidator() private {
        uint256 nativeWithdrawalAmount = withdrawNativeTokenFromGateway();
        for (uint i = 0; i < activeValidators.length; i++) {
            uint allocateAmount = nativeWithdrawalAmount * validatorToAllocationNumerator[activeValidators[i]] / _allocationDenominator();
            validatorToPendingFeeWei[activeValidators[i]] += allocateAmount;
            emit NativeTokenFeeAllocatedAmount(activeValidators[i], allocateAmount);
        }
        totalPendingFeeWei += nativeWithdrawalAmount;
    }

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

    function getPendingFeeWeiOnGatway(address gatewayAddress) public view returns (uint256) {
        VWBLGateway gatewayCotract = VWBLGateway(gatewayAddress);
        return gatewayCotract.pendingFee();
    }

    function allocateERC20ToValidator() private {
        address[] memory registeredFeeTokens = IERC20FeeRegistry(gatewayV2Address).getRegisteredFeeTokens();
        uint256[] memory erc20WithdrawalAmounts = IVWBLGatewayV2(gatewayV2Address).withdrawERC20Fee();
        
        for (uint i = 0; i < registeredFeeTokens.length; i++) {
            if (erc20WithdrawalAmounts[i] > 0) {
                for (uint j = 0; j < activeValidators.length; j++) {
                    uint allocateAmount = erc20WithdrawalAmounts[i] * validatorToAllocationNumerator[activeValidators[j]] / _allocationDenominator();
                    validatorToPendingFeeDecimals[activeValidators[j]][registeredFeeTokens[i]] += allocateAmount;
                    emit ERC20FeeAllocatedAmount(activeValidators[j], registeredFeeTokens[i], allocateAmount);
                }
                erc20ToTotalPendingFeeDecimals[registeredFeeTokens[i]] += erc20WithdrawalAmounts[i];
            }
        }
    }
}
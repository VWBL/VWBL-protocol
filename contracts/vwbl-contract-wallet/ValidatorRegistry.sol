// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

import "./MultiSigWallet.sol";

contract ValidatorRegistry is MultiSigWallet {
    // if AllocationNumerator = 10*10^2, allocation percentage is 10%.
    mapping (address => uint96) public validatorToAllocationNumerator;
    address[] public activeValidators;

    constructor(
        address[] memory _owners,
        uint _required
    ) MultiSigWallet(_owners, _required) {}

    function _allocationDenominator() internal pure virtual returns (uint96) {
        return 10000;
    }

    /**
     * @notice Checks if a given address is an active validator.
     * @dev This function returns true if the validator's allocation numerator is not zero, indicating active status.
     * @param validator The address of the validator to check.
     * @return bool Returns true if the validator is active, false otherwise.
     */
    function isActiveValidator(address validator) public view returns (bool) {
        return validatorToAllocationNumerator[validator] != 0;
    }

    /**
     * @notice Registers validators and their allocation numerators.
     * @dev This function allows for the registration of validators and their corresponding allocation numerators.
     *      It checks that the length of the validators array matches the length of the allocationNumerators array,
     *      calculates the total allocation numerator, and ensures it is within the valid range.
     *      It then registers each validator with their allocation numerator, unregisters validators that are no longer active,
     *      and updates the activeValidators array.
     * @param validators An array of validator address to be registered.
     * @param allocationNumerators An array of uint96 representing the allocation numerators for each validator.
     *      The allocation numerator is a part of the fraction that represents the validator's allocation percentage.
     *      The denominator is provided by the _allocationDenominator function.
     */
    function registerValidatorAllocations(address[] memory validators, uint96[] memory allocationNumerators) public onlyMultiSigWallet {
        require(validators.length == allocationNumerators.length, "param lengths is invalid");
        uint96 totalAllocationNumerator;
        for (uint i = 0; i < allocationNumerators.length; i++) {
            totalAllocationNumerator += allocationNumerators[i];
        }
        require(
            totalAllocationNumerator <= _allocationDenominator()
            && totalAllocationNumerator > _allocationDenominator() - 10,
            "each allocation numerator is inccorect value"
        );

        for (uint i = 0; i < validators.length; i++) {
            validatorToAllocationNumerator[validators[i]] = allocationNumerators[i];
        }
        unregisterLeaveValidators(validators);
        activeValidators = validators;
    }

    /**
     * @notice Unregisters validators that are no longer part of the new validator set.
     * @dev This function compares the current active validator set with the new validator set provided.
     *      Validators that are not found in the new set are considered to have left and are unregistered.
     *      Their allocation numerators are deleted, effectively removing them from the active validator set.
     * @param newValidators An array of validator addresses that represents the new active validator set.
     */
    function unregisterLeaveValidators(address[] memory newValidators) private {
        address[] memory leaveValidators = new address[](activeValidators.length);
        uint leaveCount = 0;
        for (uint i = 0; i < activeValidators.length; i++) {
            bool found = false;
            for (uint j = 0; j < newValidators.length && !found;  j++) {
                if (activeValidators[i] == newValidators[j]) {
                    found = true;
                }
            }
            if (!found) {
                leaveValidators[leaveCount] = activeValidators[i];
                leaveCount++;
            }
        }

        if (leaveCount > 0) {
            for (uint i = 0; i < leaveCount; i++) {
                delete validatorToAllocationNumerator[leaveValidators[i]];
            }
        }
    }
    
    /**
     * @notice Gets the list of active validators.
     * @dev This function returns an array of addresses of the currently active validators.
     * @return An array of addresses of the active validators.
     */
    function getActiveValidators() public view returns (address[] memory) {
        return activeValidators;
    }

    /**
     * @notice Returns the total number of validators that are currently active.
     * @dev This function returns the length of the activeValidators array, which represents the total number of active validators.
     * @return The total number of active validators.
     */
    function getActiveValidatorCount() public view returns (uint) {
        return activeValidators.length;
    }
}
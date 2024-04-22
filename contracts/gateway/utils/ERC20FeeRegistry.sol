pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./IERC20FeeRegistry.sol";

contract ERC20FeeRegistry is IERC20FeeRegistry, Ownable {
    // VWBL mint fee of erc20 token
    mapping (address => uint256) public erc20ToFeeDecimals;
    address[] public registeredFeeTokens;

    event feeDecimalsChanged(address erc20Address, uint256 oldPercentage, uint256 newPercentage);
    
    constructor(address _initialOwner) Ownable(_initialOwner) {} 

    /**
     * @notice Registers a new ERC20 token with a specified fee decimal.
     * @dev This function allows the contract owner to register a new ERC20 token and set its fee decimal.
     *      It checks if the token is already registered and if the new fee decimal is different from the old one.
     *      If the token is not already registered, it adds the token to the list of registered fee tokens.
     *      It then updates the fee decimal for the token and emits a `feeDecimalsChanged` event.
     * @param erc20Address The address of the ERC20 token to register.
     * @param newFeeDecimals The fee decimal to set for the ERC20 token.
     * @return The contract address of the ERC20 token.
     */
    function registerFeeDecimals(address erc20Address, uint newFeeDecimals) public onlyOwner returns (uint256) {
        uint256 oldFeeDecimals = erc20ToFeeDecimals[erc20Address];
        require(oldFeeDecimals != newFeeDecimals, "new fee decimals is equal to old fee decimals");
        erc20ToFeeDecimals[erc20Address] = newFeeDecimals;
        if (!registered(erc20Address)) {
            registeredFeeTokens.push(erc20Address);
        }

        emit feeDecimalsChanged(erc20Address, oldFeeDecimals, newFeeDecimals);
        return newFeeDecimals;
    }

    /**
     * @notice Returns the fee decimals and registration status for a given ERC20 token address.
     * @dev This function checks if the ERC20 token address is registered and returns its fee decimals along with a boolean indicating its registration status.
     *      If the token is not registered, it returns 0 for the fee decimals and false for the registration status.
     * @param erc20Address The address of the ERC20 token.
     * @return feeDecimals The fee decimals associated with the ERC20 token.
     * @return isRegistered A boolean indicating if the ERC20 token is registered.
     */
    function getFeeDecimals(address erc20Address) public view returns (uint256, bool) {
        if (!registered(erc20Address)) {
            return (0, false);
        }
        return (erc20ToFeeDecimals[erc20Address], true);
    }

    /**
     * @notice Checks if an ERC20 token is registered in the fee registry.
     * @dev This function checks if the given ERC20 token address is registered by looking up the fee decimals mapping and the registered fee tokens array.
     * @param erc20Address The address of the ERC20 token.
     * @return bool Returns true if the ERC20 token is registered, false otherwise.
     */
    function registered(address erc20Address) public view returns (bool) {
        if (erc20ToFeeDecimals[erc20Address] != 0) {return true;}
        return false;
    }

    /**
     * @notice Unregisters an ERC20 token from the fee registry.
     * @dev This function allows the contract owner to remove an ERC20 token from the list of registered fee tokens.
     *      It checks if the token is currently registered and then proceeds to remove it from the list of registered tokens.
     *      It also deletes the fee decimal associated with the token.
     * @param erc20Address The address of the ERC20 token to unregister.
     */
    function unregisterFeeToken(address erc20Address) public onlyOwner {
        require(registered(erc20Address), "This erc20 is not registered for VWBL Fee Token");
        address[] memory newRegisteredFeeTokens = new address[](registeredFeeTokens.length-1);
        uint j = 0;
        for (uint i = 0; i < registeredFeeTokens.length; i++) {
            if (registeredFeeTokens[i] != erc20Address) {
                newRegisteredFeeTokens[j] = registeredFeeTokens[i];
                j++;
            }
        }
        registeredFeeTokens = newRegisteredFeeTokens;
        delete erc20ToFeeDecimals[erc20Address];
    }

    /**
     * @notice Returns the list of registered ERC20 Fee tokens in the fee registry.
     * @return An array of addresses the registered ERC20 Fee tokens.
     */
    function getRegisteredFeeTokens() public view returns (address[] memory) {
        return registeredFeeTokens;
    }

    /**
     * @notice Returns the total number of registered ERC20 Fee tokens.
     * @return The total count of registered ERC20 Fee tokens.
     */
    function getRegisteredFeeTokensCount() public view returns (uint) {
        return registeredFeeTokens.length;
    }
}
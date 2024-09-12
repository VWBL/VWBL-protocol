// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

interface IStableCoinFeeRegistry {
    /**
     * @notice Registers information about a new stable coin.
     * @param _fiatName The name of fiat currency.
     * @param _erc20Addresses The list of ERC20 addresses representing the stable coin.
     * @param _feeNumerator The fee numerator denominated in fiat currency.
     */
    function registerStableCoinInfo(
        string memory _fiatName,
        address[] memory _erc20Addresses,
        uint8[] memory _decimalses,
        uint256 _feeNumerator
    ) external;

    /**
     * @notice Registers a new fee numerator for a specific stable coin.
     * @param fiatIndex The index of the stable coin to register the fee numerator for.
     * @param newFeeNumerator The new fee numerator denominated in fiat currency to register.
     */
    function registerFeeNumerator(uint256 fiatIndex, uint256 newFeeNumerator) external;

    /**
     * @notice Renames the fiat currency associated with a specific fiat index.
     * @param fiatIndex The index of the fiat currency to be renamed.
     * @param newFiatName The new name for the fiat currency.
     */
    function renameFiat(uint256 fiatIndex, string memory newFiatName) external;

    /**
     * @notice Registers new ERC20 addresses for a specific stable coin.
     * @param fiatIndex The index of the stable coin to register the ERC20 addresses for.
     * @param newERC20Addresses The list of new ERC20 addresses to register.
     */
    function registerERC20Addresses(uint256 fiatIndex, address[] memory newERC20Addresses, uint8[] memory _decimalses) external;

    /**
     * @notice Unregisters an ERC20 address for a specific stable coin.
     * @param fiatIndex The index of the stable coin to unregister the ERC20 address from.
     * @param erc20Address The address of the ERC20 token to unregister.
     */
    function unregisterERC20Address(uint256 fiatIndex, address erc20Address) external;

    /**
     * @notice Checks if an ERC20 token is registered in the fee registry.
     * @param erc20Address The address of the ERC20 token.
     * @return bool Returns true if the ERC20 token is registered, false otherwise.
     */
    function registered(address erc20Address) external view returns (bool);

    /**
     * @notice Returns the fee decimals and registration status for a given ERC20 token address.
     * @param erc20Address The address of the ERC20 token.
     * @return feeDecimals The fee decimals associated with the ERC20 token.
     * @return isRegistered A boolean indicating if the ERC20 token is registered.
     */
    function getFeeDecimals(address erc20Address) external view returns (uint256, bool);

    /**
     * @notice Returns the list of registered ERC20 Fee tokens in the fee registry.
     * @return An array of addresses the registered ERC20 Fee tokens.
     */
    function getRegisteredTokens() external view returns (address[] memory);

    /**
     * @notice Returns the total number of registered ERC20 Fee tokens.
     * @return The total count of registered ERC20 Fee tokens.
     */
    function getRegisteredTokensCount() external view returns (uint256);

    /**
     * @notice Returns the list of previous registered ERC20 Fee tokens in the fee registry.
     * @return An array of addresses the previous registered ERC20 Fee tokens.
     */
    function getPrevRegisteredTokens() external view returns (address[] memory);

    /**
     * @notice Returns the total number of previous registered ERC20 Fee tokens.
     * @return The total count of previous registered ERC20 Fee tokens.
     */
    function getPrevRegisteredTokensCount() external view returns (uint256);

    /**
     * @notice Returns the list of previously and currently registered ERC20 Fee tokens in the fee registry.
     * @return An array of addresses the previous registered ERC20 Fee tokens.
     */
    function getPrevAndCurRegisteredTokens() external view returns (address[] memory);
}

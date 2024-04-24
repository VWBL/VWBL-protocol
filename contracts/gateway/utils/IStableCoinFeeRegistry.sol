pragma solidity ^0.8.20;

interface IStableCoinFeeRegistry {
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
    function getRegisteredTokensCount() external view returns (uint);

    /**
     * @notice Returns the list of previous registered ERC20 Fee tokens in the fee registry.
     * @return An array of addresses the previous registered ERC20 Fee tokens.
     */
    function getPrevRegisteredTokens() external view returns (address[] memory);

    /**
     * @notice Returns the total number of previous registered ERC20 Fee tokens.
     * @return The total count of previous registered ERC20 Fee tokens.
     */
    function getPrevRegisteredTokensCount() external view returns (uint);

    /**
     * @notice Returns the list of previously and currently registered ERC20 Fee tokens in the fee registry.
     * @return An array of addresses the previous registered ERC20 Fee tokens.
     */
    function getPrevAndCurRegisteredTokens() external view returns (address[] memory);
}
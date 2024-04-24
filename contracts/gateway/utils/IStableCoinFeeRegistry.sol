pragma solidity ^0.8.20;

interface IStableCoinFeeRegistry {
    /**
     * @notice Returns the list of registered ERC20 Fee tokens in the fee registry.
     * @return An array of addresses the registered ERC20 Fee tokens.
     */
    function getRegisteredFeeTokens() external view returns (address[] memory);

    /**
     * @notice Returns the fee decimals and registration status for a given ERC20 token address.
     * @param erc20Address The address of the ERC20 token.
     * @return feeDecimals The fee decimals associated with the ERC20 token.
     * @return isRegistered A boolean indicating if the ERC20 token is registered.
     */
    function getFeeDecimals(address erc20Address) external view returns (uint256, bool);
}
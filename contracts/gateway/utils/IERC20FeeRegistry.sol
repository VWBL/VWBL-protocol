pragma solidity ^0.8.20;

interface IERC20FeeRegistry {
    /**
     * @notice Returns the list of registered ERC20 Fee tokens in the fee registry.
     * @return An array of addresses the registered ERC20 Fee tokens.
     */
    function getRegisteredFeeTokens() external view returns (address[] memory);
}
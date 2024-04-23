pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "./IERC20FeeRegistry.sol";

contract ERC20FeeRegistry is IERC20FeeRegistry, Ownable {
    struct StableCoinInfo {
        string fiatName;
        // The list of erc20 address of stable coin.
        address[] erc20Addresses;
        // VWBL Fee which is denominated by fiat. 
        // If VWBL Fee is 15 yen, feeNumerator = 15 * 10 ** 10000(_feeDenominator())
        uint feeNumerator;
    }
    // fiatIndex start from 1.
    uint public nextFiatIndex = 1;
    mapping (uint => StableCoinInfo) fiatIndexToSCInfo;
    mapping (address => uint) public erc20ToFiatIndex;

    event feeDecimalsChanged(address erc20Address, uint256 oldFeeDecimals, uint256 newFeeDecimals);
    event StableCoinFeeChanged(string fiatName, uint256 oldFee, uint256 newFee);    
    constructor(address _initialOwner) Ownable(_initialOwner) {}

    function _feeDenominator() internal pure virtual returns (uint96) {
        return 10000;
    }

    function registerStableCoinInfo(string memory _fiatName, address[] memory _erc20Addresses, uint _feeNumerator) public onlyOwner {
        uint fiatIndex = nextFiatIndex++;
        StableCoinInfo storage scInfo = fiatIndexToSCInfo[fiatIndex];
        scInfo.fiatName = _fiatName;
        scInfo.erc20Addresses = _erc20Addresses;
        scInfo.feeNumerator = _feeNumerator;
        for (uint i = 0; i < _erc20Addresses.length; i++) {
            erc20ToFiatIndex[_erc20Addresses[i]] = fiatIndex;
        }
    }

    function renameFiat(uint fiatIndex, string memory newFiatName) public onlyOwner {
        fiatIndexToSCInfo[fiatIndex].fiatName = newFiatName;
    }

    function registerERC20Addresses(uint fiatIndex, address[] memory newERC20Addresses) public onlyOwner {
        StableCoinInfo storage scInfo = fiatIndexToSCInfo[fiatIndex];
        for (uint i = 0; i < newERC20Addresses.length; i++) {
            require(!registered(newERC20Addresses[i]), "This ERC20 is already registered");
        }
        for (uint i = 0; i < newERC20Addresses.length; i++) {
            scInfo.erc20Addresses.push(newERC20Addresses[i]);
        }
    }

    function registerFeeNumerator(uint fiatIndex, uint newFeeNumerator) public onlyOwner {
        StableCoinInfo storage scInfo = fiatIndexToSCInfo[fiatIndex];
        uint oldFeeNumerator = scInfo.feeNumerator;
        require(oldFeeNumerator != newFeeNumerator);
        scInfo.feeNumerator = newFeeNumerator;
        emit StableCoinFeeChanged(scInfo.fiatName, oldFeeNumerator/_feeDenominator(), newFeeNumerator/_feeDenominator());
    }

    /**
     * @notice Checks if an ERC20 token is registered in the fee registry.
     * @param erc20Address The address of the ERC20 token.
     * @return bool Returns true if the ERC20 token is registered, false otherwise.
     */
    function registered(address erc20Address) public view returns (bool) {
        if (erc20ToFiatIndex[erc20Address] != 0) {return true;}
        return false;
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
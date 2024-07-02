// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;
import "hardhat/console.sol";

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "./IStableCoinFeeRegistry.sol";
contract StableCoinFeeRegistry is IStableCoinFeeRegistry, Ownable {
    struct StableCoinInfo {
        string fiatName;
        // The list of erc20 address of stable coin.
        address[] erc20Addresses;
        // VWBL Fee which is denominated by fiat.
        // If VWBL Fee is 15 yen, feeNumerator = 15 * 10 ** 10000(_feeDenominator())
        uint256 feeNumerator;
    }
    // fiatIndex start from 1.
    uint256 public nextFiatIndex = 1;
    mapping(uint256 => StableCoinInfo) fiatIndexToSCInfo;
    mapping(address => uint256) public erc20ToFiatIndex;
    mapping (address => uint8) public erc20ToDecimals;
    uint256 public registeredTokensCount;
    address[] public prevRegisteredTokens;

    event FeeTokenRegistered(address erc20);
    event FeeTokenUnregistered(address erc20);
    event StableCoinFeeChanged(string fiatName, uint256 oldFee, uint256 newFee);

    constructor(address _initialOwner) Ownable(_initialOwner) {}

    function _feeDenominator() internal pure virtual returns (uint96) {
        return 10000;
    }

    /**
     * @notice Returns an array of StableCoinInfo structs representing the registered stable coins.
     * @return An array of StableCoinInfo structs.
     */
    function getStableCoinInfos() public view returns (StableCoinInfo[] memory) {
        StableCoinInfo[] memory stableCoinInfos = new StableCoinInfo[](nextFiatIndex - 1);
        uint256 k = 0;
        for (uint256 i = 1; i < nextFiatIndex; i++) {
            stableCoinInfos[k] = fiatIndexToSCInfo[i];
        }
        return stableCoinInfos;
    }

    /**
     * @notice Registers information about a new stable coin.
     * @param _fiatName The name of fiat currency.
     * @param _erc20Addresses The list of ERC20 addresses representing the stable coin.
     * @param _decimalses The list of ERC20 address decimals
     * @param _feeNumerator The fee numerator denominated in fiat currency.
     */
    function registerStableCoinInfo(
        string memory _fiatName,
        address[] memory _erc20Addresses,
        uint8[] memory _decimalses,
        uint256 _feeNumerator
    ) public onlyOwner {
        for (uint256 i = 0; i < _erc20Addresses.length; i++) {
            require(!registered(_erc20Addresses[i]), "ERC20 is already registered");
        }
        uint256 fiatIndex = nextFiatIndex;
        nextFiatIndex++;
        StableCoinInfo storage scInfo = fiatIndexToSCInfo[fiatIndex];
        scInfo.fiatName = _fiatName;
        scInfo.erc20Addresses = _erc20Addresses;
        scInfo.feeNumerator = _feeNumerator;
        for (uint256 i = 0; i < _erc20Addresses.length; i++) {
            erc20ToFiatIndex[_erc20Addresses[i]] = fiatIndex;
            erc20ToDecimals[_erc20Addresses[i]] = _decimalses[i];
        }
        registeredTokensCount += _erc20Addresses.length;
    }

    /**
     * @notice Renames the fiat currency associated with a specific fiat index.
     * @param fiatIndex The index of the fiat currency to be renamed.
     * @param newFiatName The new name for the fiat currency.
     */
    function renameFiat(uint256 fiatIndex, string memory newFiatName) public onlyOwner {
        require(fiatIndex < nextFiatIndex, "fiatIndex is invalid");
        fiatIndexToSCInfo[fiatIndex].fiatName = newFiatName;
    }

    // TODO: decimals登録
    /**
     * @notice Registers new ERC20 addresses for a specific stable coin.
     * @param fiatIndex The index of the stable coin to register the ERC20 addresses for.
     * @param _decimalses The list of ERC20 address decimals
     * @param newERC20Addresses The list of new ERC20 addresses to register.
     */
    function registerERC20Addresses(uint256 fiatIndex, address[] memory newERC20Addresses,
        uint8[] memory _decimalses
    ) public onlyOwner {
        require(fiatIndex < nextFiatIndex, "fiatIndex is invalid");
        StableCoinInfo storage scInfo = fiatIndexToSCInfo[fiatIndex];
        for (uint256 i = 0; i < newERC20Addresses.length; i++) {
            require(!registered(newERC20Addresses[i]), "This ERC20 is already registered");
        }
        for (uint256 i = 0; i < newERC20Addresses.length; i++) {
            scInfo.erc20Addresses.push(newERC20Addresses[i]);
            erc20ToFiatIndex[newERC20Addresses[i]] = fiatIndex;
            erc20ToDecimals[newERC20Addresses[i]] = _decimalses[i];
            emit FeeTokenRegistered(newERC20Addresses[i]);
        }
        registeredTokensCount += newERC20Addresses.length;
    }

    /**
     * @notice Unregisters an ERC20 address for a specific stable coin.
     * @param fiatIndex The index of the stable coin to unregister the ERC20 address from.
     * @param erc20Address The address of the ERC20 token to unregister.
     */
    function unregisterERC20Address(uint256 fiatIndex, address erc20Address) public onlyOwner {
        require(fiatIndex < nextFiatIndex, "fiatIndex is invalid");
        require(registered(erc20Address), "This ERC20 is not registered");

        registeredTokensCount -= 1;
        StableCoinInfo storage scInfo = fiatIndexToSCInfo[fiatIndex];
        address[] memory newERC20Addresses = new address[](scInfo.erc20Addresses.length - 1);
        uint256 j = 0;
        for (uint256 i = 0; i < scInfo.erc20Addresses.length; i++) {
            if (scInfo.erc20Addresses[i] != erc20Address) {
                newERC20Addresses[j] = scInfo.erc20Addresses[i];
                j++;
            }
        }
        scInfo.erc20Addresses = newERC20Addresses;
        delete erc20ToFiatIndex[erc20Address];
        delete erc20ToDecimals[erc20Address];

        bool prevRegistered = false;
        for (uint256 i = 0; i < prevRegisteredTokens.length; i++) {
            if (prevRegisteredTokens[i] == erc20Address) {
                prevRegistered = true;
            }
        }
        if (!prevRegistered) {
            prevRegisteredTokens.push(erc20Address);
        }

        emit FeeTokenUnregistered(erc20Address);
    }

    /**
     * @notice Registers a new fee numerator for a specific stable coin.
     * @param fiatIndex The index of the stable coin to register the fee numerator for.
     * @param newFeeNumerator The new fee numerator denominated in fiat currency to register.
     */
    function registerFeeNumerator(uint256 fiatIndex, uint256 newFeeNumerator) public onlyOwner {
        require(fiatIndex < nextFiatIndex, "fiatIndex is invalid");
        StableCoinInfo storage scInfo = fiatIndexToSCInfo[fiatIndex];
        uint256 oldFeeNumerator = scInfo.feeNumerator;
        require(oldFeeNumerator != newFeeNumerator);
        scInfo.feeNumerator = newFeeNumerator;
        emit StableCoinFeeChanged(scInfo.fiatName, oldFeeNumerator, newFeeNumerator);
    }

    /**
     * @notice Checks if an ERC20 token is registered in the fee registry.
     * @param erc20Address The address of the ERC20 token.
     * @return bool Returns true if the ERC20 token is registered, false otherwise.
     */
    function registered(address erc20Address) public view returns (bool) {
        if (erc20ToFiatIndex[erc20Address] != 0) {
            return true;
        }
        return false;
    }

    /**
     * @notice Returns the fee decimals and registration status for a given ERC20 token address.
     * @param erc20Address The address of the ERC20 token.
     * @return feeDecimals The fee decimals associated with the ERC20 token.
     * @return isRegistered A boolean indicating if the ERC20 token is registered.
     */
   function getFeeDecimals(address erc20Address) public view returns (uint256, bool) {
    if (!registered(erc20Address)) {
        return (0, false);
    }
    uint256 fiatIndex = erc20ToFiatIndex[erc20Address];
    uint256 feeNumerator = fiatIndexToSCInfo[fiatIndex].feeNumerator;
    uint8 decimals = erc20ToDecimals[erc20Address];
    uint256 feeDecimals = (feeNumerator * 10**decimals) / _feeDenominator();
    // uint256 feeDecimals = feeNumerator * (10**decimals / _feeDenominator());
    return (feeDecimals, true);
    }

    /**
     * @notice Returns the list of registered ERC20 Fee tokens in the fee registry.
     * @return An array of addresses the registered ERC20 Fee tokens.
     */
    function getRegisteredTokens() public view returns (address[] memory) {
        address[] memory registeredTokens = new address[](registeredTokensCount);
        uint256 k = 0;
        for (uint256 i = 1; i < nextFiatIndex; i++) {
            for (uint256 j = 0; j < fiatIndexToSCInfo[i].erc20Addresses.length; j++) {
                registeredTokens[k] = fiatIndexToSCInfo[i].erc20Addresses[j];
                k += 1;
            }
        }
        return registeredTokens;
    }

    /**
     * @notice Returns the total number of registered ERC20 Fee tokens.
     * @return The total count of registered ERC20 Fee tokens.
     */
    function getRegisteredTokensCount() public view returns (uint256) {
        return registeredTokensCount;
    }

    /**
     * @notice Returns the list of previously registered ERC20 Fee tokens in the fee registry.
     * @return An array of addresses the previous registered ERC20 Fee tokens.
     */
    function getPrevRegisteredTokens() public view returns (address[] memory) {
        return prevRegisteredTokens;
    }

    /**
     * @notice Returns the total number of previously registered ERC20 Fee tokens.
     * @return The total count of previous registered ERC20 Fee tokens.
     */
    function getPrevRegisteredTokensCount() public view returns (uint256) {
        return prevRegisteredTokens.length;
    }

    /**
     * @notice Returns the list of previously and currently registered ERC20 Fee tokens in the fee registry.
     * @return An array of addresses the previously and currently registered ERC20 Fee tokens.
     */
    function getPrevAndCurRegisteredTokens() public view returns (address[] memory) {
        uint256 resultTokensCount = getRegisteredTokensCount() + getPrevRegisteredTokensCount();
        address[] memory resultTokens = new address[](resultTokensCount);
        resultTokens = getRegisteredTokens();
        uint256 j = 0;
        for (uint256 i = getRegisteredTokensCount(); i < resultTokensCount; i++) {
            resultTokens[i] = prevRegisteredTokens[j];
            j += 1;
        }
        return resultTokens;
    }

    /**
     * @notice Returns the total number of previously and currently registered ERC20 Fee tokens in the fee registry.
     * @return The total count of previously and currently registered ERC20 Fee tokens.
     */
    function getPrevAndCurRegisteredTokensCount() public view returns (uint256) {
        return registeredTokensCount + prevRegisteredTokens.length;
    }
    function getErc20ToFiatIndex(address erc20Address) public view returns (uint256) {
    return erc20ToFiatIndex[erc20Address];

    }
    function reset() public onlyOwner {
    nextFiatIndex = 1;
    registeredTokensCount = 0;

    // Clear all mappings
    for (uint256 i = 1; i < nextFiatIndex; i++) {
        delete fiatIndexToSCInfo[i];
    }

    for (uint256 i = 0; i < prevRegisteredTokens.length; i++) {
        delete erc20ToFiatIndex[prevRegisteredTokens[i]];
    }

    delete prevRegisteredTokens;
    }
}

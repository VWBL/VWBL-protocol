pragma solidity ^0.8.20;

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
        uint feeNumerator;
    }
    // fiatIndex start from 1.
    uint public nextFiatIndex = 1;
    mapping (uint => StableCoinInfo) fiatIndexToSCInfo;
    mapping (address => uint) public erc20ToFiatIndex;
    uint public registeredTokensCount;
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
        StableCoinInfo[] memory stableCoinInfos = new StableCoinInfo[](nextFiatIndex-1);
        uint k = 0;
        for (uint i = 1; i < nextFiatIndex; i++) {
            stableCoinInfos[k] = fiatIndexToSCInfo[i];
        }
        return stableCoinInfos;
    }

    /**
     * @notice Registers information about a new stable coin.
     * @param _fiatName The name of fiat currency.
     * @param _erc20Addresses The list of ERC20 addresses representing the stable coin.
     * @param _feeNumerator The fee numerator denominated in fiat currency.
     */
    function registerStableCoinInfo(string memory _fiatName, address[] memory _erc20Addresses, uint _feeNumerator) public onlyOwner {
        for (uint i = 0; i < _erc20Addresses.length; i++) {
            require(!registered(_erc20Addresses[i]), "ERC20 is already registered");
        }
        uint fiatIndex = nextFiatIndex++;
        StableCoinInfo storage scInfo = fiatIndexToSCInfo[fiatIndex];
        scInfo.fiatName = _fiatName;
        scInfo.erc20Addresses = _erc20Addresses;
        scInfo.feeNumerator = _feeNumerator;
        for (uint i = 0; i < _erc20Addresses.length; i++) {
            erc20ToFiatIndex[_erc20Addresses[i]] = fiatIndex;
        }
        registeredTokensCount += _erc20Addresses.length;
    }

    /**
     * @notice Renames the fiat currency associated with a specific fiat index.
     * @param fiatIndex The index of the fiat currency to be renamed.
     * @param newFiatName The new name for the fiat currency.
     */
    function renameFiat(uint fiatIndex, string memory newFiatName) public onlyOwner {
        require(fiatIndex < nextFiatIndex, "fiatIndex is invalid");
        fiatIndexToSCInfo[fiatIndex].fiatName = newFiatName;
    }

    /**
     * @notice Registers new ERC20 addresses for a specific stable coin.
     * @param fiatIndex The index of the stable coin to register the ERC20 addresses for.
     * @param newERC20Addresses The list of new ERC20 addresses to register.
     */
    function registerERC20Addresses(uint fiatIndex, address[] memory newERC20Addresses) public onlyOwner {
        require(fiatIndex < nextFiatIndex, "fiatIndex is invalid");
        StableCoinInfo storage scInfo = fiatIndexToSCInfo[fiatIndex];
        for (uint i = 0; i < newERC20Addresses.length; i++) {
            require(!registered(newERC20Addresses[i]), "This ERC20 is already registered");
        }

        registeredTokensCount += newERC20Addresses.length;
        for (uint i = 0; i < newERC20Addresses.length; i++) {
            scInfo.erc20Addresses.push(newERC20Addresses[i]);
            erc20ToFiatIndex[newERC20Addresses[i]] = fiatIndex;
            emit FeeTokenRegistered(newERC20Addresses[i]);
        }
        registeredTokensCount += newERC20Addresses.length;
    }

    /**
     * @notice Unregisters an ERC20 address for a specific stable coin.
     * @param fiatIndex The index of the stable coin to unregister the ERC20 address from.
     * @param erc20Address The address of the ERC20 token to unregister.
     */
    function unregisterERC20Address(uint fiatIndex, address erc20Address) public onlyOwner {
        require(fiatIndex < nextFiatIndex, "fiatIndex is invalid");
        require(registered(erc20Address), "This ERC20 is not registered");

        registeredTokensCount -= 1;
        StableCoinInfo storage scInfo = fiatIndexToSCInfo[fiatIndex];
        address[] memory newERC20Addresses = new address[](scInfo.erc20Addresses.length-1);
        uint j = 0;
        for (uint i = 0; i < scInfo.erc20Addresses.length; i++) {
            if (scInfo.erc20Addresses[i] != erc20Address) {
                newERC20Addresses[j] = scInfo.erc20Addresses[i];
                j++;
            }
        }
        scInfo.erc20Addresses = newERC20Addresses;
        delete erc20ToFiatIndex[erc20Address];

        bool prevRegistered = false;
        for (uint i = 0; i < prevRegisteredTokens.length; i++) {
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
    function registerFeeNumerator(uint fiatIndex, uint newFeeNumerator) public onlyOwner {
        require(fiatIndex < nextFiatIndex, "fiatIndex is invalid");
        StableCoinInfo storage scInfo = fiatIndexToSCInfo[fiatIndex];
        uint oldFeeNumerator = scInfo.feeNumerator;
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
        if (erc20ToFiatIndex[erc20Address] != 0) {return true;}
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
        uint fiatIndex = erc20ToFiatIndex[erc20Address];
        uint feeNumerator = fiatIndexToSCInfo[fiatIndex].feeNumerator;
        uint8 decimals = ERC20(erc20Address).decimals();
        uint feeDecimals = feeNumerator * (10**decimals / _feeDenominator());
        return (feeDecimals, true);
    }

    /**
     * @notice Returns the list of registered ERC20 Fee tokens in the fee registry.
     * @return An array of addresses the registered ERC20 Fee tokens.
     */
    function getRegisteredTokens() public view returns (address[] memory) {
        address[] memory registeredTokens = new address[](registeredTokensCount);
        uint k = 0;
        for (uint i = 1; i < nextFiatIndex; i++) {
            for (uint j = 0; j < fiatIndexToSCInfo[i].erc20Addresses.length; j++) {
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
    function getRegisteredTokensCount() public view returns (uint) {
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
    function getPrevRegisteredTokensCount() public view returns (uint) {
        return prevRegisteredTokens.length;
    }

    /**
     * @notice Returns the list of previously and currently registered ERC20 Fee tokens in the fee registry.
     * @return An array of addresses the previous registered ERC20 Fee tokens.
     */
    function getPrevAndCurRegisteredTokens() public view returns (address[] memory) {
        uint resultTokensCount = getRegisteredTokensCount() + getPrevRegisteredTokensCount();
        address[] memory resultTokens = new address[](resultTokensCount);
        resultTokens = getRegisteredTokens();
        uint j = 0;
        for (uint i = getRegisteredTokensCount(); i < resultTokensCount; i++) {
            resultTokens[i] = prevRegisteredTokens[j];
            j += 1;
        }
        return resultTokens;
    }
}
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./IVWBLGatewayV2.sol";
import "./legacy/VWBLGateway.sol";
import "../access-condition/AbstractControlChecker.sol";
import "./utils/IStableCoinFeeRegistry.sol";


contract VWBLGatewayV2 is IVWBLGatewayV2, Ownable {
    VWBLGateway immutable vwblGatewayV1Contract;
    address public scFeeRegistryAddress;

    mapping(bytes32 => address) public documentIdToConditionContractV2;
    mapping(bytes32 => address) public documentIdToMinterV2;
    bytes32[] public documentIdsV2;

    // VWBL mint fee of native token(if this contract exist on Polygon mainnet, native token is MATIC)
    uint256 public feeWei = 1000000000000000000; // 1MATIC
    uint256 public pendingFee;


    event accessControlAdded(bytes32 documentId, address conditionContract);
    event feeWeiChanged(uint256 oldPercentage, uint256 newPercentage);
    event stableCoinFeeRegistryChanged(address oldSCFeeRegistry, address newSCFeeRegistry);

    constructor(
        address _initialOwner,
        address _vwblGatewayV1,
        address _scFeeRegistryAddress
    ) Ownable(_initialOwner) {
        vwblGatewayV1Contract = VWBLGateway(_vwblGatewayV1);
        scFeeRegistryAddress = _scFeeRegistryAddress;
    }

    /**
     * @notice This method returns the address of the condition contract associated with a given document ID.
     * @param documentId The Identifier of digital content and decryption key
     * @return The address of the condition contract associated with the document ID, or the zero address if none is found.
     */
    function documentIdToConditionContract(bytes32 documentId) public view returns (address) {
        if (documentIdToConditionContractV2[documentId] != address(0)) {
            return documentIdToConditionContractV2[documentId];
        }
        if (vwblGatewayV1Contract.documentIdToConditionContract(documentId) != address(0)) {
            return vwblGatewayV1Contract.documentIdToConditionContract(documentId);
        }
        return address(0);
    }

    /**
     * @notice This method returns the address of the minter associated with a given document ID.
     * @param documentId The Identifier of digital content and decryption key
     * @return The address of the minter associated with the document ID, or the zero address if none is found.
     */
    function documentIdToMinter(bytes32 documentId) public view returns (address) {
        if (documentIdToMinterV2[documentId] != address(0)) {
            return documentIdToMinterV2[documentId];
        }
        if (vwblGatewayV1Contract.documentIdToMinter(documentId) != address(0)) {
            return vwblGatewayV1Contract.documentIdToMinter(documentId);
        }
        return address(0);
    }

    /**
     * @notice Get array of documentIds
     */
    function getDocumentIds() public view returns (bytes32[] memory) {
        bytes32[] memory documentIdsV1 = vwblGatewayV1Contract.getDocumentIds();
        bytes32[] memory combinedDocumentIds = new bytes32[](documentIdsV1.length + documentIdsV2.length);
        for (uint i = 0; i < documentIdsV1.length; i++) {
            combinedDocumentIds[i] = documentIdsV1[i];
        }
        for (uint i = 0; i < documentIdsV2.length; i++) {
            combinedDocumentIds[documentIdsV1.length + i] = documentIdsV2[i];
        }
        return combinedDocumentIds;
    }

    /**
     * @notice This method paginates through the combined list of document IDs from both VWBLGatewayV1 and VWBLGatewayV2.
     * @param startIndex The starting index for pagination.
     * @param endIndex The ending index for pagination.
     * @return An array of document IDs within the specified range.
     */
    function paginateDocumentIds(uint256 startIndex, uint256 endIndex) public view returns (bytes32[] memory) {
        bytes32[] memory result = new bytes32[](endIndex-startIndex+1);
        bytes32[] memory documentIdsV1 = vwblGatewayV1Contract.getDocumentIds();
        uint resultIndex = 0;
        if (startIndex <= documentIdsV1.length-1) {
            if (endIndex <= documentIdsV1.length-1) {
                for (uint i = startIndex; i <= endIndex; i++) {
                    result[resultIndex] = documentIdsV1[i];
                    resultIndex += 1;
                }
                return result;
            } else if (endIndex <= documentIdsV1.length+documentIdsV2.length-1) {
                for (uint i = startIndex; i < documentIdsV1.length; i++) {
                    result[resultIndex] = documentIdsV1[i];
                    resultIndex += 1;
                }
                for (uint i = 0; i <= endIndex-documentIdsV1.length; i++) {
                    result[resultIndex] = documentIdsV2[i];
                    resultIndex += 1;
                }
                return result;
            } else {
                for (uint i = startIndex; i < documentIdsV1.length; i++) {
                    result[resultIndex] = documentIdsV1[i];
                    resultIndex += 1;
                }
                for (uint i = 0; i < documentIdsV2.length; i++) {
                    result[resultIndex] = documentIdsV2[i];
                    resultIndex += 1;
                }
                return result;
            }
        } else {
            if (endIndex <= documentIdsV1.length+documentIdsV2.length-1) {
                for (uint i = startIndex; i <= endIndex; i++) {
                    result[resultIndex] = documentIdsV2[i-documentIdsV1.length];
                    resultIndex += 1;
                }
                return result;
            } else {
                for (uint i = 0; i <= documentIdsV2.length-1; i++) {
                    result[resultIndex] = documentIdsV2[i+startIndex-documentIdsV1.length];
                    resultIndex + 1;
                }
                return result;
            }
        }
    }

    /**
     * @notice Returns count of documentIds
     */
    function documentIdsCount() public view returns (uint256) {
        bytes32[] memory documentIdsV1 = vwblGatewayV1Contract.getDocumentIds();
        return documentIdsV1.length + documentIdsV2.length;
    }

    /**
     * @notice Returns True if user has access rights of digital content or digital content creator
     *         This function is called by VWBL Network (Decryption key management network)
     * @param user The address of decryption key requester or decryption key sender to VWBL Network
     * @param documentId The Identifier of digital content and decryption key
     */
    function hasAccessControl(address user, bytes32 documentId) public view returns (bool) {
        address accessConditionContractAddress = documentIdToConditionContract(documentId);
        if (accessConditionContractAddress == address(0)) {
            return false;
        }
        AbstractControlChecker checker = AbstractControlChecker(accessConditionContractAddress);
        bool isOwner = checker.getOwnerAddress(documentId) == user;
        bool minterHasOnlySetKeyRights = checkMinterHasOnlySetKeyRights(checker);
        bool isMinter = documentIdToMinter(documentId) == user;
        bool hasAccess = checker.checkAccessControl(user, documentId);
        return isOwner || (!minterHasOnlySetKeyRights && isMinter) || hasAccess;
    }

    /**
     * @notice Checks if the minter has only the rights to set keys, without viewing rights.
     *         This method attempts to call `setMinterHasOnlySetKeyRights` on the provided `checker` contract.
     *         If the call succeeds, it returns the boolean result indicating the minter's rights.
     *         If the call fails, it catches the error and returns false, indicating the minter does not have only set key rights.
     * @param checker The AbstractControlChecker contract instance to perform the check on.
     * @return bool Returns true if the minter has only set key rights, false otherwise.
     */
    function checkMinterHasOnlySetKeyRights(AbstractControlChecker checker) private view returns (bool) {
        try checker.setMinterHasOnlySetKeyRights() returns (bool result) {
            return result;
        } catch {
            return false;
        }
    }

    /**
     * @notice Checks if a user has the rights of set encryption key to VWBL Network.
     *         This function checks if the user is either the owner, the minter, or has been granted access control
     *         for the specified document by querying the associated access condition contract.
     * @param user The address of the user whose rights are being checked.
     * @param documentId The Identifier of digital content and decryption key.
     * @return bool Returns true if the user has the rights to set keys for the document, false otherwise.
     */
    function hasSetKeyRights(address user, bytes32 documentId) public view returns (bool) {
        address accessConditionContractAddress = documentIdToConditionContract(documentId);
        if (accessConditionContractAddress == address(0)) {
            return false;
        }
        AbstractControlChecker checker = AbstractControlChecker(accessConditionContractAddress);
        bool isOwner = checker.getOwnerAddress(documentId) == user;
        bool isMinter = documentIdToMinter(documentId) == user;
        bool hasAccess = checker.checkAccessControl(user, documentId);
        return isOwner || isMinter || hasAccess;
    }

    /**
     * @notice Grant access control feature and registering access condition of digital content
     * @param documentId The Identifier of digital content and decryption key
     * @param conditionContractAddress The contract address of access condition
     * @param minter The address of digital content creator
     */
    function grantAccessControl(
        bytes32 documentId,
        address conditionContractAddress,
        address minter
    ) public payable {
        require(msg.value == feeWei, "Paid VWBL Fee is incorrect amount");
        require(documentIdToConditionContract(documentId) == address(0), "documentId is already used");

        pendingFee += msg.value;
        documentIdsV2.push(documentId);
        setAccessControlInfo(documentId, conditionContractAddress, minter);
    }

    /**
     * @notice This method allows for the batch granting of access control to multiple digital content at once. It requires the caller to pay a fee based on the number of digital content for which access is being granted.
     * @param documentIds An array of Identifiers for the digital content and decryption keys
     * @param conditionContractAddress The address of the access condition contract to be applied to all provided document IDs
     * @param minter The address of the digital content creator, applied to all provided document IDs
     */
    function batchGrantAccessControl(
        bytes32[] memory documentIds,
        address conditionContractAddress,
        address minter
    ) public payable {
        require(msg.value == feeWei*documentIds.length, "Paid VWBL Fee is incorrect amount");
        for (uint256 i = 0; i < documentIds.length; i++) {
            require(documentIdToConditionContract(documentIds[i]) == address(0), "documentId is already used");
        }

        pendingFee += msg.value;
        for (uint256 i = 0; i < documentIds.length; i++) {
            documentIdsV2.push(documentIds[i]);
            setAccessControlInfo(documentIds[i], conditionContractAddress, minter);
        }        
    }

    /**
     * @notice Grant access control using ERC20 tokens as payment for the VWBL fee. This method allows a user to pay the VWBL fee using a specified ERC20 token instead of the native token.
     * @param documentId The Identifier of digital content and decryption key
     * @param conditionContractAddress The address of the access condition contract
     * @param minter The address of the digital content creator
     * @param erc20Address The address of the ERC20 token used to pay the fee
     * @param feePayer The address of the entity paying the fee
     */
    function grantAccessControlWithERC20(
        bytes32 documentId,
        address conditionContractAddress,
        address minter,
        address erc20Address,
        address feePayer
    ) public {
        (uint feeDecimals, bool registered) = IStableCoinFeeRegistry(scFeeRegistryAddress).getFeeDecimals(erc20Address);
        require(registered, "This erc20 is not registered for VWBL Fee Token");
        require(IERC20(erc20Address).allowance(feePayer, address(this)) >= feeDecimals, "VWBL Gateway Contract's allowance is insufficient");
        require(documentIdToConditionContract(documentId) == address(0), "documentId is already used");

        IERC20(erc20Address).transferFrom(feePayer, address(this), feeDecimals);
        documentIdsV2.push(documentId);
        setAccessControlInfo(documentId, conditionContractAddress, minter);
    }  


    /**
     * @notice Grant batch access control using ERC20 tokens as payment for the VWBL fee. This method allows users to pay the VWBL fee using a specified ERC20 token instead of the native token for multiple digital contents at once.
     * @param documentIds An array of Identifiers for the digital content and decryption keys
     * @param conditionContractAddress The address of the access condition contract to be applied to all provided document IDs
     * @param minter The address of the digital content creator, applied to all provided document IDs
     * @param erc20Address The address of the ERC20 token used to pay the fee
     * @param feePayer The address of the entity paying the fee
     */
    function batchGrantAccessControlWithERC20(
        bytes32[] memory documentIds,
        address conditionContractAddress,
        address minter,
        address erc20Address,
        address feePayer
    ) public {
        (uint feeDecimals, bool registered) = IStableCoinFeeRegistry(scFeeRegistryAddress).getFeeDecimals(erc20Address);
        require(registered, "This erc20 is not registered for VWBL Fee Token");
        require(IERC20(erc20Address).allowance(feePayer, address(this)) >= feeDecimals * documentIds.length, "VWBL Gateway Contract's allowance is insufficient");
        for (uint256 i = 0; i < documentIds.length; i++) {
            require(documentIdToConditionContract(documentIds[i]) == address(0), "documentId is already used");
        }

        IERC20(erc20Address).transferFrom(feePayer, address(this), feeDecimals * documentIds.length);
        for (uint256 i = 0; i < documentIds.length; i++) {
            documentIdsV2.push(documentIds[i]);
            setAccessControlInfo(documentIds[i], conditionContractAddress, minter);
        }
    }

    /**
     * @notice Sets the access control information for a given document ID
     * @param documentId The Identifier of digital content and decryption key
     * @param conditionContractAddress The address of the access condition contract
     * @param minter The address of the digital content creator
     */
    function setAccessControlInfo(bytes32 documentId, address conditionContractAddress, address minter) private {
        documentIdToConditionContractV2[documentId] = conditionContractAddress;
        documentIdToMinterV2[documentId] = minter;
        emit accessControlAdded(documentId, conditionContractAddress);
    }

    function payFee(bytes32 documentId, address user) public payable {

    }

    /**
     * @notice Withdraw vwbl fee by contract owner
     */
    function withdrawFee() public onlyOwner {
        uint256 amount = pendingFee;
        require(amount != 0);
        // Remember to zero the pending refund before
        // sending to prevent re-entrancy attacks
        pendingFee = 0;
        payable(msg.sender).transfer(amount);
    }

    /**
     * @notice Set new VWBL fee of native token
     * @param newFeeWei new VWBL fee of native token
     */
    function setFeeWei(uint256 newFeeWei) public onlyOwner {
        require(newFeeWei != feeWei);
        uint256 oldFeeWei = feeWei;
        feeWei = newFeeWei;
        emit feeWeiChanged(oldFeeWei, newFeeWei);
    }

    /**
     * @notice Withdraws ERC20 token fees accumulated in the contract to the contract owner's address
     * @dev This function can only be called by the contract owner.
     * @return withdrawalAmounts An array of amounts withdrawn for each registered fee token.
     */
    function withdrawERC20Fee() public onlyOwner returns (uint256[] memory) {
        address[] memory registeredFeeTokens = IStableCoinFeeRegistry(scFeeRegistryAddress).getRegisteredFeeTokens();
        uint256[] memory withdrawalAmounts = new uint256[](registeredFeeTokens.length);
        for (uint i = 0; i < registeredFeeTokens.length; i++) {
            uint256 balance = IERC20(registeredFeeTokens[i]).balanceOf(address(this));
            if (balance > 0) {
                IERC20(registeredFeeTokens[i]).transfer(msg.sender, balance);
            }
            withdrawalAmounts[i] = balance;
        }
        return withdrawalAmounts;
    }

    /**
     * @notice Set new address of Stable Coin Fee Registry contract
     * @param newScFeeRegistryAddress The new address of the Stable Coin Fee Registry contract
     */
    function setStableCoinFeeRegistry(address newScFeeRegistryAddress) public onlyOwner {
        require(newScFeeRegistryAddress != scFeeRegistryAddress);
        address oldSCFeeRegistryAddress = scFeeRegistryAddress;
        scFeeRegistryAddress = newScFeeRegistryAddress;

        emit stableCoinFeeRegistryChanged(oldSCFeeRegistryAddress, newScFeeRegistryAddress);
    }
}
pragma solidity ^0.8.20;

import "./legacy/IVWBLGateway.sol";

interface IVWBLGatewayV2 is IVWBLGateway {
    /**
     * @notice This method returns the address of the condition contract associated with a given document ID.
     * @param documentId The Identifier of digital content and decryption key
     * @return The address of the condition contract associated with the document ID, or the zero address if none is found.
     */
    function documentIdToConditionContract(bytes32 documentId) external view returns (address);

    /**
     * @notice This method returns the address of the minter associated with a given document ID.
     * @param documentId The Identifier of digital content and decryption key
     * @return The address of the minter associated with the document ID, or the zero address if none is found.
     */
    function documentIdToMinter(bytes32 documentId) external view returns (address);

    /**
     * @notice This method paginates through the combined list of document IDs from both VWBLGatewayV1 and VWBLGatewayV2.
     * @param startIndex The starting index for pagination.
     * @param endIndex The ending index for pagination.
     * @return An array of document IDs within the specified range.
     */
    function paginateDocumentIds(uint256 startIndex, uint256 endIndex) external view returns (bytes32[] memory);

    /**
     * @notice Returns count of documentIds
     */
    function documentIdsCount() external view returns (uint256);

    /**
     * @notice Checks if a user has the rights of set encryption key to VWBL Network.
     *         This function checks if the user is either the owner, the minter, or has been granted access control
     *         for the specified document by querying the associated access condition contract.
     * @param user The address of the user whose rights are being checked.
     * @param documentId The Identifier of digital content and decryption key.
     * @return bool Returns true if the user has the rights to set keys for the document, false otherwise.
     */
    function hasSetKeyRights(address user, bytes32 documentId) external view returns (bool);

     /**
     * @notice This method allows for the batch granting of access control to multiple digital content at once. It requires the caller to pay a fee based on the number of digital content for which access is being granted.
     * @param documentIds An array of Identifiers for the digital content and decryption keys
     * @param conditionContractAddress The address of the access condition contract to be applied to all provided document IDs
     * @param minter The address of the digital content creator, applied to all provided document IDs
     */
    function batchGrantAccessControl(bytes32[] memory documentIds, address conditionContractAddress, address minter) external payable;
}

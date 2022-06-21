pragma solidity ^0.8.0;

interface IRentableVWBL {
    function onRentalByUser(uint256 tokenId, address user) external view returns (bool);
}
pragma solidity ^0.8.0;

interface IVWBLMarket {
    function emitSoldEvent(uint256 sellPrice, uint256 tokenId, address from, address to) external;
}
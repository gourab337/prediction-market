// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "./MarketUpgradeable.sol";

contract MarketFactoryUpgradeable is Initializable, UUPSUpgradeable, OwnableUpgradeable {
    address public marketImplementation;
    address public usdc;
    address[] public markets;

    event MarketCreated(address indexed market, string description, uint256 endTime);

    function initialize(address _marketImplementation, address _usdc) public initializer {
        __Ownable_init();
        __UUPSUpgradeable_init();
        marketImplementation = _marketImplementation;
        usdc = _usdc;
    }

    function createMarket(string memory description, uint256 endTime) external onlyOwner {
        require(endTime > block.timestamp, "Invalid end time");
        // Clone the implementation and initialize in one step
        address market = address(new MarketUpgradeable());
        MarketUpgradeable(market).initialize(description, endTime, msg.sender, usdc);
        markets.push(market);
        emit MarketCreated(market, description, endTime);
    }

    function getMarkets(uint256 offset, uint256 limit) external view returns (address[] memory) {
        uint256 total = markets.length;
        if (offset >= total) {
            return new address[](0);
        }
        
        uint256 end = offset + limit;
        if (end > total) {
            end = total;
        }
        
        uint256 length = end - offset;
        address[] memory result = new address[](length);
        
        for (uint256 i = 0; i < length; i++) {
            result[i] = markets[offset + i];
        }
        
        return result;
    }

    function getMarketsCount() external view returns (uint256) {
        return markets.length;
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}
}
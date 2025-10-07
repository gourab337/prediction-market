// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockERC20 is ERC20 {
    uint8 private immutable __decimals;

    constructor(string memory name, string memory symbol, uint8 decimals_) ERC20(name, symbol) {
        __decimals = decimals_;
    }

    function decimals() public view virtual override returns (uint8) {
        return __decimals;
    }

    function mint(address to, uint256 amount) public {
        _mint(to, amount);
    }
}
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract AMMPool is ERC20, Pausable, Ownable {
    event LiquidityAdded(address indexed provider, uint256 usdcAmount, uint256 shares);
    event LiquidityRemoved(address indexed provider, uint256 usdcAmount, uint256 shares);
    event SwapExecuted(address indexed user, uint256 usdcIn, uint256 sharesOut);
    event EmergencyWithdrawn(address token, address to, uint256 amount);
    
    address public usdc;
    address public market;
    bool public isYes;
    uint256 public reserveUSDC;
    uint256 public reserveShares;
    uint256 public constant FEE = 30; // 0.3%
    
    // Decimal handling constants
    uint256 public constant USDC_DECIMALS = 6;
    uint256 public constant SHARE_DECIMALS = 18;
    uint256 public constant DECIMAL_SCALE = 10**(SHARE_DECIMALS - USDC_DECIMALS); // 10^12

    constructor(address _usdc, address _market, bool _isYes) 
        ERC20(_isYes ? "YES Shares" : "NO Shares", _isYes ? "YES" : "NO") {
        usdc = _usdc;
        market = _market;
        isYes = _isYes;
        // Don't transfer ownership - keep it as the deployer (Market contract)
    }

    function addLiquidity(uint256 usdcAmount) external whenNotPaused {
        require(usdcAmount > 0, "Amount must be > 0");
        IERC20(usdc).transferFrom(msg.sender, address(this), usdcAmount);
        
        uint256 shares;
        if (totalSupply() == 0) {
            // First liquidity provider gets shares equal to USDC amount scaled to 18 decimals
            shares = usdcAmount * DECIMAL_SCALE;
        } else {
            // Subsequent providers get proportional shares
            shares = (usdcAmount * totalSupply()) / reserveUSDC;
        }
        
        require(shares > 0, "Shares must be > 0");
        
        _mint(msg.sender, shares);
        reserveUSDC += usdcAmount;
        reserveShares = totalSupply(); // Keep in sync with actual total supply
        
        emit LiquidityAdded(msg.sender, usdcAmount, shares);
    }

    function swapIn(uint256 usdcIn, address to) external {
        require(msg.sender == market, "Only market");
        require(usdcIn > 0, "Amount must be > 0");
        
        uint256 fee = (usdcIn * FEE) / 10000;
        uint256 usdcNet = usdcIn - fee;
        
        uint256 sharesOut;
        if (totalSupply() == 0) {
            // Scale USDC (6 decimals) to shares (18 decimals)
            sharesOut = usdcNet * DECIMAL_SCALE;
        } else {
            // Use the constant product formula: x * y = k
            // newReserveShares = (reserveUSDC * totalSupply()) / (reserveUSDC + usdcNet)
            // sharesOut = totalSupply() - newReserveShares
            uint256 newReserveShares = (reserveUSDC * totalSupply()) / (reserveUSDC + usdcNet);
            sharesOut = totalSupply() - newReserveShares;
        }
        
        require(sharesOut > 0, "Shares must be > 0");
        
        _mint(to, sharesOut);
        reserveUSDC += usdcNet;
        reserveShares = totalSupply(); // Keep in sync
        
        emit SwapExecuted(to, usdcIn, sharesOut);
    }

    function getPrice() public view returns (uint256) {
        if (totalSupply() == 0) return 0;
        // Return price in USDC per share (scaled to 6 decimals to match USDC)
        // reserveUSDC (6 decimals) * DECIMAL_SCALE (1e12) / totalSupply() (18 decimals) = 6 decimals
        return (reserveUSDC * DECIMAL_SCALE) / totalSupply();
    }

    function getReserveUSDC() public view returns (uint256) {
        return reserveUSDC;
    }

    function getReserveShares() public view returns (uint256) {
        return reserveShares;
    }

    function getReserveInfo() public view returns (
        uint256 usdcReserve,
        uint256 sharesReserve,
        uint256 totalShares,
        uint256 currentPrice
    ) {
        return (reserveUSDC, reserveShares, totalSupply(), getPrice());
    }

    function calculatePayout(address user) public view returns (uint256) {
        uint256 userShares = balanceOf(user);
        if (userShares == 0 || totalSupply() == 0) return 0;
        
        // User's proportional share of the USDC reserve
        return (userShares * reserveUSDC) / totalSupply();
    }

    function removeLiquidity(uint256 lpAmount) external whenNotPaused {
        require(lpAmount > 0, "Invalid amount");
        require(balanceOf(msg.sender) >= lpAmount, "Insufficient LP tokens");
        require(totalSupply() > 0, "No liquidity");

        uint256 usdcAmount = (lpAmount * reserveUSDC) / totalSupply();
        
        require(usdcAmount > 0, "USDC amount must be > 0");

        _burn(msg.sender, lpAmount);
        reserveUSDC -= usdcAmount;
        reserveShares = totalSupply(); // Update to match burned tokens

        IERC20(usdc).transfer(msg.sender, usdcAmount);
        emit LiquidityRemoved(msg.sender, usdcAmount, lpAmount);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function emergencyWithdraw(address token, address to) external onlyOwner {
        require(paused(), "Must be paused");
        uint256 amount = IERC20(token).balanceOf(address(this));
        require(amount > 0, "No tokens to withdraw");
        IERC20(token).transfer(to, amount);
        emit EmergencyWithdrawn(token, to, amount);
    }
}
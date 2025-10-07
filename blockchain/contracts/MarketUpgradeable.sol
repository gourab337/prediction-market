// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./AMMPool.sol";
import "./ResolutionModuleUpgradeable.sol";

contract MarketUpgradeable is Initializable, UUPSUpgradeable, ReentrancyGuardUpgradeable, PausableUpgradeable, OwnableUpgradeable {
    string public description;
    uint256 public endTime;
    bool public resolved;
    uint8 public outcome; // 0: unresolved, 1: YES, 2: NO
    address public yesPool;
    address public noPool;
    address public usdc;
    address public resolutionModule;

    event BetPlaced(address indexed user, bool yes, uint256 amount);
    event OutcomeSet(uint8 outcome);

    function initialize(string memory _description, uint256 _endTime, address _owner, address _usdc) public initializer {
        __Ownable_init();
        __UUPSUpgradeable_init();
        __ReentrancyGuard_init();
        __Pausable_init();
        
        description = _description;
        endTime = _endTime;
        usdc = _usdc; // Use the provided USDC address (can be MockERC20 for tests)
        
        // Deploy pools
        AMMPool yesPoolContract = new AMMPool(usdc, address(this), true);
        AMMPool noPoolContract = new AMMPool(usdc, address(this), false);
        
        yesPool = address(yesPoolContract);
        noPool = address(noPoolContract);
        
        // Transfer pool ownership to the market owner for admin functions
        yesPoolContract.transferOwnership(_owner);
        noPoolContract.transferOwnership(_owner);
        
        _transferOwnership(_owner);
    }

    function setResolutionModule(address _resolutionModule) external onlyOwner {
        resolutionModule = _resolutionModule;
    }

    function bet(bool yes, uint256 amount) external nonReentrant whenNotPaused {
        require(block.timestamp < endTime, "Market ended");
        require(!resolved, "Market resolved");
        IERC20(usdc).transferFrom(msg.sender, address(this), amount);
        
        // Approve the pool to spend USDC
        IERC20(usdc).approve(yes ? yesPool : noPool, amount);
        
        address pool = yes ? yesPool : noPool;
        AMMPool(pool).swapIn(amount, msg.sender);
        emit BetPlaced(msg.sender, yes, amount);
    }

    function redeem() external nonReentrant {
        require(resolved, "Not resolved");
        uint256 yesBalance = IERC20(yesPool).balanceOf(msg.sender);
        uint256 noBalance = IERC20(noPool).balanceOf(msg.sender);
        if (outcome == 1 && yesBalance > 0) {
            IERC20(usdc).transfer(msg.sender, yesBalance);
            IERC20(yesPool).transferFrom(msg.sender, address(this), yesBalance);
        } else if (outcome == 2 && noBalance > 0) {
            IERC20(usdc).transfer(msg.sender, noBalance);
            IERC20(noPool).transferFrom(msg.sender, address(this), noBalance);
        }
    }

    function setOutcome(uint8 _outcome) external {
        require(msg.sender == resolutionModule, "Only resolution module");
        require(_outcome == 1 || _outcome == 2, "Invalid outcome");
        resolved = true;
        outcome = _outcome;
        emit OutcomeSet(_outcome);
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}
}
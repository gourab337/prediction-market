// Market Factory ABI
export const MARKET_FACTORY_ABI = [
  "function createMarket(string description, uint256 endTime) external",
  "function getMarkets(uint256 offset, uint256 limit) external view returns (address[])",
  "function getMarketsCount() external view returns (uint256)",
  "function marketImplementation() external view returns (address)",
  "function usdc() external view returns (address)",
  "function initialize(address _marketImplementation, address _usdc) external",
  "function owner() external view returns (address)",
  "function proxiableUUID() external view returns (bytes32)",
  "function upgradeToAndCall(address newImplementation, bytes data) external payable"
];

// Market ABI (MarketUpgradeable)
export const MARKET_ABI = [
  // Basic info
  "function description() external view returns (string)",
  "function endTime() external view returns (uint256)",
  "function resolved() external view returns (bool)",
  "function outcome() external view returns (uint8)",
  "function yesPool() external view returns (address)",
  "function noPool() external view returns (address)",
  "function usdc() external view returns (address)",
  "function resolutionModule() external view returns (address)",
  
  // Market operations
  "function bet(bool yes, uint256 amount) external",
  "function redeem() external",
  "function setResolutionModule(address _resolutionModule) external",
  "function setOutcome(uint8 _outcome) external",
  
  // Admin functions
  "function owner() external view returns (address)",
  "function pause() external",
  "function unpause() external",
  "function paused() external view returns (bool)",
  
  // Events
  "event BetPlaced(address indexed user, bool yes, uint256 amount)",
  "event OutcomeSet(uint8 outcome)"
];

// ERC20 ABI (for USDC and MockERC20)
export const ERC20_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address owner) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 value) returns (bool)",
  "function transfer(address to, uint256 value) returns (bool)",
  "function transferFrom(address from, address to, uint256 value) returns (bool)",
  "event Approval(address indexed owner, address indexed spender, uint256 value)",
  "event Transfer(address indexed from, address indexed to, uint256 value)"
];

// AMM Pool ABI (AMMPool.sol)
export const AMM_POOL_ABI = [
  // ERC20 functions
  "function name() external view returns (string)",
  "function symbol() external view returns (string)",
  "function totalSupply() external view returns (uint256)",
  "function balanceOf(address account) external view returns (uint256)",
  "function transfer(address to, uint256 amount) external returns (bool)",
  "function transferFrom(address from, address to, uint256 amount) external returns (bool)",
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint256)",
  
  // Pool-specific functions
  "function usdc() external view returns (address)",
  "function market() external view returns (address)",
  "function isYes() external view returns (bool)",
  "function reserveUSDC() external view returns (uint256)",
  "function reserveShares() external view returns (uint256)",
  "function getPrice() external view returns (uint256)",
  
  // Liquidity operations
  "function addLiquidity(uint256 usdcAmount) external",
  "function removeLiquidity(uint256 lpAmount) external",
  "function swapIn(uint256 usdcIn, address to) external",
  
  // Admin functions
  "function pause() external",
  "function unpause() external",
  "function paused() external view returns (bool)",
  "function emergencyWithdraw(address token, address to) external",
  
  // Events
  "event LiquidityAdded(address indexed provider, uint256 usdcAmount, uint256 shares)",
  "event LiquidityRemoved(address indexed provider, uint256 usdcAmount, uint256 shares)",
  "event EmergencyWithdrawn(address token, address to, uint256 amount)"
];

// Resolution Module ABI (ResolutionModuleUpgradeable)
export const RESOLUTION_MODULE_ABI = [
  // Proposal functions
  "function proposeOutcome(address market, uint8 outcome) external",
  "function dispute(uint256 proposalId) external",
  "function finalizeNoDispute(uint256 proposalId) external",
  "function distributeBonds(uint256 proposalId, address winner) external",
  "function resolveDisputedProposal(uint256 proposalId, uint8 finalOutcome) external",
  
  // View functions
  "function proposals(uint256) external view returns (uint256 marketId, uint8 outcome, address proposer, address disputer, uint256 bond, uint256 challengeEnd, bool disputed, bool finalized)",
  "function proposalCount() external view returns (uint256)",
  "function usdc() external view returns (address)",
  "function adminResolver() external view returns (address)",
  
  // Constants
  "function BOND_AMOUNT() external view returns (uint256)",
  "function CHALLENGE_WINDOW() external view returns (uint256)",
  
  // Events
  "event OutcomeProposed(uint256 indexed proposalId, uint256 marketId, uint8 outcome)",
  "event Disputed(uint256 indexed proposalId, address disputer)",
  "event BondsDistributed(uint256 indexed proposalId, address winner, uint256 amount)"
];

// Admin Resolver ABI (AdminResolver)
export const ADMIN_RESOLVER_ABI = [
  // Resolution functions
  "function resolveDispute(uint256 proposalId, uint8 finalOutcome, address resolutionModule) external",
  
  // Admin functions
  "function owner() external view returns (address)",
  "function transferOwnership(address newOwner) external",
  
  // Events
  "event BondsDistributed(uint256 proposalId, address winner, address loser, uint256 amount)"
];
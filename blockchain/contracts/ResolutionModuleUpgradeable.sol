// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./MarketUpgradeable.sol";

contract ResolutionModuleUpgradeable is Initializable, UUPSUpgradeable, OwnableUpgradeable {
    struct Proposal {
        uint256 marketId;
        uint8 outcome;
        address proposer;
        address disputer;
        uint256 bond;
        uint256 challengeEnd;
        bool disputed;
        bool finalized;
    }

    mapping(uint256 => Proposal) public proposals;
    uint256 public proposalCount;
    uint256 public constant BOND_AMOUNT = 1000 * 10**6; // $1000 USDC (6 decimals)
    uint256 public constant CHALLENGE_WINDOW = 2 hours;
    address public usdc;
    address public adminResolver;

    event OutcomeProposed(uint256 indexed proposalId, uint256 marketId, uint8 outcome);
    event Disputed(uint256 indexed proposalId, address disputer);
    event BondsDistributed(uint256 indexed proposalId, address winner, uint256 amount);

    function initialize(address _usdc, address _adminResolver) public initializer {
        __Ownable_init();
        __UUPSUpgradeable_init();
        usdc = _usdc;
        adminResolver = _adminResolver;
    }

    function proposeOutcome(address market, uint8 outcome) external {
        require(outcome == 1 || outcome == 2, "Invalid outcome");
        IERC20(usdc).transferFrom(msg.sender, address(this), BOND_AMOUNT);
        uint256 proposalId = proposalCount++;
        proposals[proposalId] = Proposal({
            marketId: uint256(uint160(market)),
            outcome: outcome,
            proposer: msg.sender,
            disputer: address(0),
            bond: BOND_AMOUNT,
            challengeEnd: block.timestamp + CHALLENGE_WINDOW,
            disputed: false,
            finalized: false
        });
        emit OutcomeProposed(proposalId, uint256(uint160(market)), outcome);
    }

    function dispute(uint256 proposalId) external {
        Proposal storage prop = proposals[proposalId];
        require(block.timestamp < prop.challengeEnd, "Window closed");
        require(!prop.disputed, "Already disputed");
        IERC20(usdc).transferFrom(msg.sender, address(this), prop.bond);
        prop.disputed = true;
        prop.disputer = msg.sender;
        emit Disputed(proposalId, msg.sender);
    }

    function finalizeNoDispute(uint256 proposalId) external {
        Proposal storage prop = proposals[proposalId];
        require(block.timestamp >= prop.challengeEnd, "Challenge window not ended");
        require(!prop.disputed, "Cannot finalize disputed proposal");
        require(!prop.finalized, "Already finalized");
        
        prop.finalized = true;
        MarketUpgradeable market = MarketUpgradeable(address(uint160(prop.marketId)));
        market.setOutcome(prop.outcome);
        IERC20(usdc).transfer(prop.proposer, prop.bond);
    }

    function distributeBonds(uint256 proposalId, address winner) external {
        require(msg.sender == adminResolver, "Only admin resolver");
        Proposal storage prop = proposals[proposalId];
        require(prop.disputed, "Not disputed");
        require(!prop.finalized, "Already finalized");
        
        prop.finalized = true;
        uint256 totalBonds = prop.bond * 2; // Proposer bond + Disputer bond
        IERC20(usdc).transfer(winner, totalBonds);
        emit BondsDistributed(proposalId, winner, totalBonds);
    }

    function resolveDisputedProposal(uint256 proposalId, uint8 finalOutcome) external {
        require(msg.sender == adminResolver, "Only admin resolver");
        Proposal storage prop = proposals[proposalId];
        require(prop.disputed, "Not disputed");
        require(!prop.finalized, "Already finalized");
    
        // Set the market outcome
        MarketUpgradeable market = MarketUpgradeable(address(uint160(prop.marketId)));
        market.setOutcome(finalOutcome);
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}
}
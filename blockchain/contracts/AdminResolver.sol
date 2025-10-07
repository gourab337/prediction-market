// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./ResolutionModuleUpgradeable.sol";

contract AdminResolver is Ownable {
    event BondsDistributed(uint256 proposalId, address winner, address loser, uint256 amount);

    function resolveDispute(uint256 proposalId, uint8 finalOutcome, address resolutionModule) external onlyOwner {
        ResolutionModuleUpgradeable module = ResolutionModuleUpgradeable(resolutionModule);
        (, uint8 proposedOutcome, address proposer, address disputer, uint256 bond, , bool disputed, ) = module.proposals(proposalId);
        require(disputed, "Not disputed");
        
        // Set market outcome through the resolution module (not directly)
        module.resolveDisputedProposal(proposalId, finalOutcome);
        
        // Determine winner and loser
        address winner = finalOutcome == proposedOutcome ? proposer : disputer;
        address loser = finalOutcome == proposedOutcome ? disputer : proposer;
        
        // Call the resolution module to distribute the bonds
        module.distributeBonds(proposalId, winner);
        
        emit BondsDistributed(proposalId, winner, loser, bond * 2);
    }
}
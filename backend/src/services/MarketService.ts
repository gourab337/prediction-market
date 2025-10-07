import { ethers } from 'ethers';
import { BLOCKCHAIN_CONFIG, provider, wallet } from '../config';
import { 
  MARKET_FACTORY_ABI, 
  MARKET_ABI, 
  ERC20_ABI,
  AMM_POOL_ABI,
  RESOLUTION_MODULE_ABI,
  ADMIN_RESOLVER_ABI
} from '../abis';
import type { 
  Market,
  MarketFactory,
  ERC20,
  AMMPool,
  ResolutionModule,
  AdminResolver
} from '../types/contracts';

interface CreateMarketParams {
  question: string;
  endTime: string;
}

interface CreateMarketResult {
  address: string;
  [key: string]: any; // Allow all additional properties
}

export class MarketService {
  private static instance: MarketService | null = null;
  private factoryContract: ethers.Contract & MarketFactory;
  private usdcContract: ethers.Contract & ERC20;
  private adminResolver: ethers.Contract & AdminResolver;
  private provider: ethers.Provider;
  private lastUsedNonce: number | null = null;
  private transactionQueue: Promise<any> = Promise.resolve();
  private nonceManager: ethers.NonceManager;

  private constructor(adminResolverAddress: string) {
    this.provider = provider;
    
    // Create nonce manager to handle sequential nonces
    if (!wallet) {
      throw new Error('Wallet not configured');
    }
    this.nonceManager = new ethers.NonceManager(wallet);

    this.factoryContract = new ethers.Contract(
      BLOCKCHAIN_CONFIG.marketFactoryAddress,
      MARKET_FACTORY_ABI,
      this.nonceManager
    ) as ethers.Contract & MarketFactory;

    this.usdcContract = new ethers.Contract(
      BLOCKCHAIN_CONFIG.usdcAddress,
      ERC20_ABI,
      this.nonceManager
    ) as ethers.Contract & ERC20;

    this.adminResolver = new ethers.Contract(
      adminResolverAddress,
      ADMIN_RESOLVER_ABI,
      this.nonceManager
    ) as ethers.Contract & AdminResolver;
  }

  // Singleton pattern - get or create instance
  public static getInstance(adminResolverAddress?: string): MarketService {
    if (!MarketService.instance) {
      if (!adminResolverAddress) {
        throw new Error('Admin resolver address required for first instance creation');
      }
      MarketService.instance = new MarketService(adminResolverAddress);
    }
    return MarketService.instance;
  }

    // Queue transactions to prevent nonce conflicts
  private async queueTransaction<T>(operation: () => Promise<T>): Promise<T> {
    console.log('🔄 Adding transaction to queue...');
    
    // Add this operation to the queue and wait for it to complete
    const promise = this.transactionQueue.then(async () => {
      try {
        console.log('🔄 Executing queued transaction...');
        const result = await operation();
        console.log('✅ Queued transaction completed successfully');
        return result;
      } catch (error) {
        console.error('❌ Queued transaction failed:', error);
        throw error;
      }
    });

    // Update the queue to point to this promise
    this.transactionQueue = promise.catch(() => {}); // Catch errors to prevent queue from breaking
    
    return promise;
  }

  // Queue individual blockchain transactions to prevent nonce conflicts
  private async queueBlockchainTransaction<T>(operation: () => Promise<T>): Promise<T> {
    return this.queueTransaction(operation);
  }

  // Get next available nonce to prevent conflicts
  private async getNextNonce(): Promise<number> {
    if (!wallet) throw new Error('Wallet not configured');
    
    const walletAddress = await wallet.getAddress();
    const currentNonce = await this.provider.getTransactionCount(walletAddress, 'pending');
    
    // If we have a cached nonce, use the higher value
    if (this.lastUsedNonce !== null && this.lastUsedNonce >= currentNonce) {
      this.lastUsedNonce += 1;
    } else {
      this.lastUsedNonce = currentNonce;
    }
    
    console.log(`Using nonce: ${this.lastUsedNonce} (chain nonce: ${currentNonce})`);
    return this.lastUsedNonce;
  }

  async getAllMarkets() {
    try {
      // First check if we can access the contract
      const code = await this.provider.getCode(this.factoryContract.target as string);
      if (code === '0x') {
        throw new Error('No contract deployed at the specified address');
      }

      // Get market addresses using the working function
      const markets = await this.factoryContract.getFunction('getMarkets')(0, 1000);
      console.log('Got market addresses:', markets);
      
      if (markets.length === 0) {
        console.log('No markets created yet');
        return [];
      }

      // Get market details from events instead of contract calls
      const factoryAddress = this.factoryContract.target as string;
      const filter = {
        address: factoryAddress,
        fromBlock: 0,
        toBlock: 'latest'
      };

      const logs = await this.provider.getLogs(filter);
      const iface = new ethers.Interface([
        'event MarketCreated(address indexed market, string description, uint256 endTime)'
      ]);

      const marketDetails: { [address: string]: any } = {};
      
      for (const log of logs) {
        try {
          const decoded = iface.parseLog(log);
          if (decoded && decoded.name === 'MarketCreated') {
            const marketAddress = decoded.args.market;
            const question = decoded.args.description;
            const endTime = decoded.args.endTime;
            
            marketDetails[marketAddress.toLowerCase()] = {
              question,
              endTime: Number(endTime),
              endTimeISO: new Date(Number(endTime) * 1000).toISOString(),
              blockNumber: log.blockNumber,
              transactionHash: log.transactionHash
            };
          }
        } catch (e) {
          // Ignore decode errors
        }
      }

      // Combine addresses with event data
      const marketList = markets.map((address: string, index: number) => {
        const details = marketDetails[address.toLowerCase()];
        return {
          address,
          id: index,
          name: details?.question || `Market ${index + 1}`,
          question: details?.question || 'Unknown',
          endTime: details?.endTime || 0,
          endTimeISO: details?.endTimeISO || null,
          created: true,
          blockNumber: details?.blockNumber,
          transactionHash: details?.transactionHash
        };
      });
      
      return marketList;
        
    } catch (error: any) {
      console.error('Error getting markets:', error);
      throw new Error('Unable to retrieve markets: ' + (error.reason || error.message));
    }
  }

  async getMarket(address: string) {
    try {
      // Check if contract exists
      const code = await this.provider.getCode(address);
      if (code === '0x') {
        throw new Error('No contract deployed at this address');
      }

      // Use the actual MarketUpgradeable interface
      const market = new ethers.Contract(
        address,
        MARKET_ABI,
        wallet || this.provider
      );

      try {
        const [
          description,
          endTime,
          resolved,
          outcome,
          yesPool,
          noPool,
          usdc,
          resolutionModule
        ] = await Promise.all([
          market.description(),
          market.endTime(),
          market.resolved(),
          market.outcome(),
          market.yesPool(),
          market.noPool(),
          market.usdc(),
          market.resolutionModule()
        ]);

        return {
          address,
          description,
          question: description, // alias for backwards compatibility
          endTime: Number(endTime),
          endTimeISO: new Date(Number(endTime) * 1000).toISOString(),
          resolved,
          outcome: Number(outcome),
          yesPool,
          noPool,
          usdc,
          resolutionModule,
          name: description,
          symbol: 'MARKET',
          deployed: true,
          codeLength: code.length,
          type: 'prediction_market',
          isActive: Number(endTime) > Math.floor(Date.now() / 1000) && !resolved
        };
      } catch (functionError: any) {
        console.error('Error calling market functions:', functionError);
        
        // Fallback to event-based data if direct function calls fail
        const factoryAddress = this.factoryContract.target as string;
        const filter = {
          address: factoryAddress,
          fromBlock: 0,
          toBlock: 'latest'
        };

        const logs = await this.provider.getLogs(filter);
        const iface = new ethers.Interface([
          'event MarketCreated(address indexed market, string description, uint256 endTime)'
        ]);

        for (const log of logs) {
          try {
            const decoded = iface.parseLog(log);
            if (decoded && decoded.name === 'MarketCreated' && decoded.args.market.toLowerCase() === address.toLowerCase()) {
              const question = decoded.args.description;
              const endTime = Number(decoded.args.endTime);
              
              return {
                address,
                question,
                endTime,
                endTimeISO: new Date(endTime * 1000).toISOString(),
                name: question,
                symbol: 'MARKET',
                deployed: true,
                codeLength: code.length,
                type: 'prediction_market',
                blockNumber: log.blockNumber,
                transactionHash: log.transactionHash,
                isActive: endTime > Math.floor(Date.now() / 1000),
                note: 'Data from events - direct contract calls failed'
              };
            }
          } catch (e) {
            // Ignore decode errors
          }
        }

        throw new Error('Could not get market data from contract or events');
      }
    } catch (error) {
      console.error('Error getting market:', error);
      throw error;
    }
  }

  async createMarket(params: CreateMarketParams): Promise<CreateMarketResult> {
    return this.queueTransaction(async () => {
      if (!wallet) {
        throw new Error('Wallet not configured');
      }
      try {
        // Convert endTime to timestamp
        const endTimeTimestamp = Math.floor(new Date(params.endTime).getTime() / 1000);
      
      console.log('Creating market with:', {
        question: params.question,
        endTime: endTimeTimestamp,
        endTimeISO: params.endTime
      });
      
      // Send the transaction 
      const txResponse = await this.factoryContract.createMarket(
        params.question,
        endTimeTimestamp
      );
      
      console.log('Transaction sent:', txResponse.hash);
      
      // Wait for transaction confirmation
      const receipt = await txResponse.wait();
      console.log('Transaction confirmed:', receipt);
      
      let marketAddress: string | undefined;
      
      // Try to get market address from event logs
      if (receipt && receipt.logs && receipt.logs.length > 0) {
        console.log('Transaction logs:', receipt.logs.map((log: any) => ({
          address: log.address,
          topics: log.topics,
          data: log.data
        })));
        
        // Try to decode the event properly
        try {
          const iface = new ethers.Interface([
            'event MarketCreated(address indexed market, string description, uint256 endTime)',
            'event Created(address indexed market)',
            'event MarketDeployed(address market)'
          ]);
          
          for (const log of receipt.logs) {
            try {
              const parsed = iface.parseLog(log);
              if (parsed && (parsed.name === 'MarketCreated' || parsed.name === 'Created' || parsed.name === 'MarketDeployed')) {
                marketAddress = parsed.args.market || parsed.args[0];
                console.log('Found market address from event:', marketAddress);
                break;
              }
            } catch (e) {
              // Ignore parsing errors for individual logs
            }
          }
        } catch (error) {
          console.log('Event parsing failed, trying manual extraction');
        }
        
        // Fallback: manual extraction
        if (!marketAddress) {
          const walletAddress = await wallet.getAddress();
          for (const log of receipt.logs) {
            if (log.topics && log.topics.length >= 2) {
              // Check if this could be a market creation event
              const potentialAddress = '0x' + log.topics[1].slice(-40);
              if (potentialAddress !== walletAddress && potentialAddress.length === 42) {
                marketAddress = potentialAddress;
                console.log('Extracted market address manually:', marketAddress);
                break;
              }
            }
          }
        }
      }
      
      // Fallback: try getMarkets to get the latest market
      if (!marketAddress) {
        try {
          const markets = await this.factoryContract.getMarkets(0, 1000); // Get all markets
          if (markets.length > 0) {
            marketAddress = markets[markets.length - 1]; // Get the latest market
          }
        } catch (fallbackError) {
          console.error('Fallback getMarkets failed:', fallbackError);
          // Final fallback: get market count and use that
          try {
            const count = await this.factoryContract.getMarketsCount();
            if (count > 0) {
              const markets = await this.factoryContract.getMarkets(Number(count) - 1, 1);
              if (markets.length > 0) {
                marketAddress = markets[0];
              }
            }
          } catch (finalError) {
            console.error('Final fallback failed:', finalError);
          }
        }
      }
      
      if (!marketAddress) {
        throw new Error('Could not determine created market address from any method');
      }

      console.log('Market created at address:', marketAddress);
      return this.getMarket(marketAddress);
    } catch (error) {
      console.error('Error creating market:', error);
      throw error;
    }
    });
  }

  async getMarketResolutionModule(marketAddress: string): Promise<{
    address: string;
    isActive: boolean;
  }> {
    try {
      const market = new ethers.Contract(
        marketAddress,
        MARKET_ABI,
        this.provider
      );

      const resolutionModuleAddress = await market.resolutionModule();
      
      return {
        address: resolutionModuleAddress,
        isActive: resolutionModuleAddress !== ethers.ZeroAddress
      };
    } catch (error) {
      console.error('Error getting resolution module:', error);
      throw error;
    }
  }

  async resolveMarket(marketAddress: string, finalWeights: string[]): Promise<void> {
    return this.queueTransaction(async () => {
      if (!wallet) {
        throw new Error('Wallet not configured');
      }

      try {
        // Check admin status - check if wallet address is the owner
        const owner = await this.adminResolver.owner();
        const walletAddress = await wallet.getAddress();
        if (owner.toLowerCase() !== walletAddress.toLowerCase()) {
          throw new Error('Not authorized to resolve market - only owner can resolve');
        }

      // Get the market's resolution module
      const market = new ethers.Contract(
        marketAddress,
        MARKET_ABI,
        wallet
      );

      let resolutionModuleAddress = await market.resolutionModule();
      
      // If no resolution module is set, set the default one from config
      if (resolutionModuleAddress === ethers.ZeroAddress) {
        console.log('No resolution module set, setting default resolution module...');
        const defaultResolutionModule = process.env.RESOLUTION_MODULE_ADDRESS || '0x8c7959fBC803fb0A18232Ad0c9F8314b9b8FB731';
        
        // Set the resolution module (only owner can do this)
        const setModuleTx = await market.setResolutionModule(defaultResolutionModule);
        await setModuleTx.wait();
        
        resolutionModuleAddress = defaultResolutionModule;
        console.log(`Set resolution module to: ${resolutionModuleAddress}`);
      }

      const resolutionModule = new ethers.Contract(
        resolutionModuleAddress,
        RESOLUTION_MODULE_ABI,
        this.nonceManager
      );

      // Convert finalWeights to outcome (0 = NO, 1 = YES, 2 = INVALID)
      // If finalWeights[0] (YES) > finalWeights[1] (NO), outcome is YES
      let outcome = 2; // Default to INVALID
      if (finalWeights.length >= 2) {
        const yesWeight = BigInt(finalWeights[0]);
        const noWeight = BigInt(finalWeights[1]);
        
        if (yesWeight > noWeight) {
          outcome = 1; // YES wins
        } else if (noWeight > yesWeight) {
          outcome = 0; // NO wins
        }
        // If equal, stays INVALID (2)
      }

      // Check and approve bond amount for resolution module
      try {
        const bondAmount = await resolutionModule.BOND_AMOUNT();
        console.log(`Bond amount required: ${ethers.formatUnits(bondAmount, 6)} USDC`);
        
        const allowance = await this.usdcContract.allowance(await this.nonceManager.getAddress(), resolutionModuleAddress);
        console.log(`Current allowance: ${ethers.formatUnits(allowance, 6)} USDC`);
        
        if (allowance < bondAmount) {
          console.log('Insufficient allowance, approving USDC for resolution bond...');
          // Approve a large amount to avoid future approvals
          const approveAmount = ethers.parseUnits('100000', 6); // 100,000 USDC
          
          console.log(`Approving ${ethers.formatUnits(approveAmount, 6)} USDC to ${resolutionModuleAddress}`);
          const approveTx = await this.usdcContract.approve(resolutionModuleAddress, approveAmount);
          
          if (approveTx && typeof approveTx === 'object' && 'hash' in approveTx) {
            console.log('Approval transaction sent:', (approveTx as any).hash);
            const receipt = await (approveTx as any).wait();
            console.log('USDC approval confirmed in block:', receipt.blockNumber);
          }
          
          // Verify the allowance was set
          const newAllowance = await this.usdcContract.allowance(await this.nonceManager.getAddress(), resolutionModuleAddress);
          console.log(`New allowance: ${ethers.formatUnits(newAllowance, 6)} USDC`);
        } else {
          console.log('Sufficient allowance already exists');
        }
      } catch (bondError: any) {
        console.error('Error handling bond approval:', bondError);
        // This might be critical for resolution, so re-throw
        throw new Error(`Failed to approve USDC for resolution: ${bondError?.message || bondError}`);
      }

      // First, we need to propose the outcome through the resolution module
      const proposeTx = await resolutionModule.proposeOutcome(marketAddress, outcome);
      const proposeReceipt = await proposeTx.wait();
      
      // Get the proposal ID from the event logs
      let proposalId: bigint | undefined;
      for (const log of proposeReceipt.logs) {
        try {
          const iface = new ethers.Interface([
            'event OutcomeProposed(uint256 indexed proposalId, uint256 marketId, uint8 outcome)'
          ]);
          const parsed = iface.parseLog(log);
          if (parsed && parsed.name === 'OutcomeProposed') {
            proposalId = parsed.args.proposalId;
            break;
          }
        } catch (e) {
          // Ignore parse errors
        }
      }

      if (proposalId === undefined) {
        // Fallback: try to get the latest proposal ID
        try {
          const proposalCount = await resolutionModule.proposalCount();
          proposalId = proposalCount - BigInt(1);
        } catch (countError) {
          console.error('Could not get proposal count, using proposalId 0');
          proposalId = BigInt(0);
        }
      }

      console.log(`Proposed outcome ${outcome} for market. Proposal ID: ${proposalId}`);

      // Wait for challenge window or finalize immediately if admin can override
      try {
        // Try to resolve through admin resolver if there's a dispute resolution function
        console.log(`Attempting admin resolution for proposal ${proposalId}...`);
        await this.adminResolver.resolveDispute(
          proposalId,
          outcome,
          resolutionModuleAddress
        );
        console.log(`Admin resolved dispute for proposal ${proposalId} with outcome: ${outcome === 1 ? 'YES' : outcome === 0 ? 'NO' : 'INVALID'}`);
      } catch (adminError: any) {
        console.log('Admin resolution failed:', adminError.message);
        
        // If admin resolution fails, try to finalize the proposal directly
        try {
          console.log(`Attempting direct finalization for proposal ${proposalId}...`);
          const finalizeTx = await resolutionModule.finalizeNoDispute(proposalId);
          await finalizeTx.wait();
          console.log(`Finalized proposal ${proposalId} without dispute. Outcome: ${outcome === 1 ? 'YES' : outcome === 0 ? 'NO' : 'INVALID'}`);
        } catch (finalizeError: any) {
          console.error('Could not finalize proposal:', finalizeError.message);
          
          // Check if the proposal was created and just return success
          try {
            const proposal = await resolutionModule.proposals(proposalId);
            console.log('Proposal details:', proposal);
            
            if (proposal && proposal.outcome === outcome) {
              console.log('Proposal was created successfully, market resolution may complete automatically');
              return; // Consider this a success
            }
          } catch (proposalCheckError: any) {
            console.error('Could not check proposal:', proposalCheckError.message);
          }
          
          throw new Error(`Could not resolve market - admin resolution failed: ${adminError.message}, finalization failed: ${finalizeError.message}`);
        }
      }
      } catch (error) {
        console.error('Error resolving market:', error);
        throw error;
      }
    });
  }

  async getAMMPool(marketAddress: string): Promise<{
    yesPool: any;
    noPool: any;
    marketInfo: any;
  }> {
    try {
      // Get market info first to get pool addresses
      const market = new ethers.Contract(
        marketAddress,
        MARKET_ABI,
        wallet || this.provider
      );

      const [yesPoolAddress, noPoolAddress] = await Promise.all([
        market.yesPool(),
        market.noPool()
      ]);

      // Get pool information
      const yesPool = new ethers.Contract(
        yesPoolAddress,
        AMM_POOL_ABI,
        wallet || this.provider
      );

      const noPool = new ethers.Contract(
        noPoolAddress,
        AMM_POOL_ABI,
        wallet || this.provider
      );

      const [
        yesName, yesSymbol, yesTotalSupply, yesReserveUSDC,
        noName, noSymbol, noTotalSupply, noReserveUSDC,
        marketDescription, marketEndTime, marketResolved
      ] = await Promise.all([
        yesPool.name(),
        yesPool.symbol(),
        yesPool.totalSupply(),
        yesPool.reserveUSDC(),
        noPool.name(),
        noPool.symbol(),
        noPool.totalSupply(),
        noPool.reserveUSDC(),
        market.description(),
        market.endTime(),
        market.resolved()
      ]);

      // Calculate prices manually since AMM's getPrice() has a bug
      // Issue: The contract's getPrice() function suffers from integer division precision loss
      // Expected: ~1,124,438 (representing $1.124438 in 6 decimals) 
      // Actual: 1 (representing $0.000001 in 6 decimals)
      // Root cause: (reserveUSDC * DECIMAL_SCALE) / totalSupply() truncates in Solidity
      // Workaround: Calculate price = reserveUSDC / totalSupply using floating-point arithmetic
      // Correct formula: price = reserveUSDC / totalSupply (both converted to same decimal base)
      const yesReserveFormatted = parseFloat(ethers.formatUnits(yesReserveUSDC, 6));
      const yesTotalSupplyFormatted = parseFloat(ethers.formatUnits(yesTotalSupply, 18));
      const noReserveFormatted = parseFloat(ethers.formatUnits(noReserveUSDC, 6));
      const noTotalSupplyFormatted = parseFloat(ethers.formatUnits(noTotalSupply, 18));
      
      const yesPrice = yesTotalSupplyFormatted > 0 ? yesReserveFormatted / yesTotalSupplyFormatted : 0;
      const noPrice = noTotalSupplyFormatted > 0 ? noReserveFormatted / noTotalSupplyFormatted : 0;

      return {
        yesPool: {
          address: yesPoolAddress,
          name: yesName,
          symbol: yesSymbol,
          totalSupply: ethers.formatUnits(yesTotalSupply, 18), // Shares have 18 decimals
          reserveUSDC: ethers.formatUnits(yesReserveUSDC, 6), // USDC has 6 decimals
          price: yesPrice.toFixed(6) // Manually calculated correct price
        },
        noPool: {
          address: noPoolAddress,
          name: noName,
          symbol: noSymbol,
          totalSupply: ethers.formatUnits(noTotalSupply, 18), // Shares have 18 decimals
          reserveUSDC: ethers.formatUnits(noReserveUSDC, 6), // USDC has 6 decimals
          price: noPrice.toFixed(6) // Manually calculated correct price
        },
        marketInfo: {
          address: marketAddress,
          description: marketDescription,
          endTime: Number(marketEndTime),
          resolved: marketResolved
        }
      };
    } catch (error) {
      console.error('Error getting AMM pool:', error);
      throw error;
    }
  }

  async bet(
    marketAddress: string,
    outcome: 'YES' | 'NO',
    usdcAmount: string
  ): Promise<{
    shareTokensReceived: string;
    transactionHash: string;
    betType: 'prediction-bet';
  }> {
    return this.queueTransaction(async () => {
      if (!wallet) {
        throw new Error('Wallet not configured');
      }

      try {
        const market = new ethers.Contract(
          marketAddress,
          MARKET_ABI,
          this.nonceManager
        );

        // Approve USDC spending to market contract
        const usdcAmountBN = ethers.parseUnits(usdcAmount, 6); // USDC has 6 decimals
        
        const allowance = await this.usdcContract.allowance(await this.nonceManager.getAddress(), marketAddress);
        if (allowance < usdcAmountBN) {
          console.log('Approving USDC spending for betting...');
          const approveTx = await this.usdcContract.approve(marketAddress, usdcAmountBN);
          if (approveTx && typeof approveTx === 'object' && 'wait' in approveTx) {
            const approveReceipt = await (approveTx as any).wait();
            console.log('USDC approval for betting confirmed:', approveReceipt.hash);
          } else {
            // Wait for state update
            await new Promise(resolve => setTimeout(resolve, 1000));
            console.log('USDC approval for betting completed');
          }
        }

        // Place bet using market contract's bet function
        // bet(bool yes, uint256 amount) - true for YES, false for NO
        console.log(`Placing ${outcome} bet...`);
        const isYes = outcome === 'YES';
        const tx = await market.bet(isYes, usdcAmountBN);
        const receipt = await tx.wait();

        // Get the amount of shares received from the transaction logs
        const transferEvents = receipt.logs.filter((log: any) => 
          log.topics[0] === ethers.id('Transfer(address,address,uint256)')
        );
        
        let shareTokensReceived = '0';
        if (transferEvents.length > 0) {
          const transferEvent = transferEvents[transferEvents.length - 1];
          shareTokensReceived = ethers.formatUnits(transferEvent.data, 18);
        }

        return {
          shareTokensReceived,
          transactionHash: tx.hash,
          betType: 'prediction-bet'
        };
      } catch (error) {
        console.error('Error placing bet:', error);
        throw error;
      }
    });
  }

  async sellShares(
    marketAddress: string,
    outcome: 'YES' | 'NO',
    shareAmount: string
  ): Promise<{
    usdcReceived: string;
    transactionHash: string;
  }> {
    if (!wallet) {
      throw new Error('Wallet not configured');
    }

    try {
      // Get the market to find the pool addresses
      const market = new ethers.Contract(
        marketAddress,
        MARKET_ABI,
        wallet
      );

      const poolAddress = outcome === 'YES' 
        ? await market.yesPool()
        : await market.noPool();

      const pool = new ethers.Contract(
        poolAddress,
        AMM_POOL_ABI,
        wallet
      );

      // Remove liquidity from the pool (sell shares)
      const shareAmountBN = ethers.parseUnits(shareAmount, 18);
      
      const tx = await pool.removeLiquidity(shareAmountBN);
      const receipt = await tx.wait();

      // Get USDC received from transaction logs
      const transferEvents = receipt.logs.filter((log: any) => 
        log.topics[0] === ethers.id('Transfer(address,address,uint256)') &&
        log.address.toLowerCase() === BLOCKCHAIN_CONFIG.usdcAddress.toLowerCase()
      );
      
      let usdcReceived = '0';
      if (transferEvents.length > 0) {
        const transferEvent = transferEvents[transferEvents.length - 1];
        usdcReceived = ethers.formatUnits(transferEvent.data, 6);
      }

      return {
        usdcReceived,
        transactionHash: tx.hash
      };
    } catch (error) {
      console.error('Error selling shares:', error);
      throw error;
    }
  }

  async addLiquidity(
    marketAddress: string,
    outcome: 'YES' | 'NO',
    usdcAmount: string
  ): Promise<{
    poolTokensReceived: string;
    transactionHash: string;
    operationType: 'liquidity-provision';
  }> {
    return this.queueTransaction(async () => {
      if (!wallet) {
        throw new Error('Wallet not configured');
      }

      try {
        // Get the market to find the pool addresses
        const market = new ethers.Contract(
          marketAddress,
          MARKET_ABI,
          this.nonceManager
        );

        const poolAddress = outcome === 'YES' 
          ? await market.yesPool()
          : await market.noPool();

        const pool = new ethers.Contract(
          poolAddress,
          AMM_POOL_ABI,
          this.nonceManager
        );

        // Approve USDC spending
        const usdcAmountBN = ethers.parseUnits(usdcAmount, 6);
        
        const allowance = await this.usdcContract.allowance(await this.nonceManager.getAddress(), poolAddress);
        if (allowance < usdcAmountBN) {
          console.log('Approving USDC spending...');
          const approveTx = await this.usdcContract.approve(poolAddress, usdcAmountBN);
          // Wait for approval transaction to be mined
          if (approveTx && typeof approveTx === 'object' && 'wait' in approveTx) {
            const approveReceipt = await (approveTx as any).wait();
            console.log('USDC approval confirmed:', approveReceipt.hash);
          } else {
            // Approval returned boolean, wait a bit for state update
            await new Promise(resolve => setTimeout(resolve, 1000));
            console.log('USDC approval completed');
          }
        }

        console.log('Adding liquidity...');
        const tx = await pool.addLiquidity(usdcAmountBN);
        const receipt = await tx.wait();

        // Get pool tokens received from transaction logs
        const transferEvents = receipt.logs.filter((log: any) => 
          log.topics[0] === ethers.id('Transfer(address,address,uint256)') &&
          log.address.toLowerCase() === poolAddress.toLowerCase()
        );
        
        let poolTokensReceived = '0';
        if (transferEvents.length > 0) {
          const transferEvent = transferEvents[transferEvents.length - 1];
          poolTokensReceived = ethers.formatUnits(transferEvent.data, 18);
        }

        return {
          poolTokensReceived,
          transactionHash: tx.hash,
          operationType: 'liquidity-provision'
        };
      } catch (error) {
        console.error('Error adding liquidity:', error);
        throw error;
      }
    });
  }

  async removeLiquidity(
    marketAddress: string,
    outcome: 'YES' | 'NO',
    poolTokenAmount: string
  ): Promise<{
    usdcReceived: string;
    transactionHash: string;
  }> {
    if (!wallet) {
      throw new Error('Wallet not configured');
    }

    try {
      // Get the market to find the pool addresses
      const market = new ethers.Contract(
        marketAddress,
        MARKET_ABI,
        wallet
      );

      const poolAddress = outcome === 'YES' 
        ? await market.yesPool()
        : await market.noPool();

      const pool = new ethers.Contract(
        poolAddress,
        AMM_POOL_ABI,
        wallet
      );

      const poolTokenAmountBN = ethers.parseUnits(poolTokenAmount, 18);
      
      const tx = await pool.removeLiquidity(poolTokenAmountBN);
      const receipt = await tx.wait();

      // Get USDC received from transaction logs
      const transferEvents = receipt.logs.filter((log: any) => 
        log.topics[0] === ethers.id('Transfer(address,address,uint256)') &&
        log.address.toLowerCase() === BLOCKCHAIN_CONFIG.usdcAddress.toLowerCase()
      );
      
      let usdcReceived = '0';
      if (transferEvents.length > 0) {
        const transferEvent = transferEvents[transferEvents.length - 1];
        usdcReceived = ethers.formatUnits(transferEvent.data, 6);
      }

      return {
        usdcReceived,
        transactionHash: tx.hash
      };
    } catch (error) {
      console.error('Error removing liquidity:', error);
      throw error;
    }
  }
}
# Loaf Markets API Documentation

Base URL: `http://localhost:3001`

## Table of Contents
- [Market Management](#market-management)
- [Market Operations](#market-operations)
- [Position Tracking](#position-tracking)
- [Setup & Configuration](#setup--configuration)
- [Debug & Testing](#debug--testing)
- [Events](#events)
- [Factory Operations](#factory-operations)

---

## Market Management

### GET /api/markets
Get all markets.

**Response:**
```json
{
  "markets": [
    {
      "address": "0x...",
      "description": "Market question",
      "endTime": 1234567890,
      "resolved": false
    }
  ]
}
```

### GET /api/markets/:address
Get specific market details.

**Parameters:**
- `address` (string): Market contract address

**Response:**
```json
{
  "address": "0x...",
  "description": "Market question",
  "endTime": 1234567890,
  "resolved": false,
  "outcome": null,
  "yesPool": "0x...",
  "noPool": "0x..."
}
```

### POST /api/markets
Create a new market.

**Request Body:**
```json
{
  "question": "Will the demo work?",
  "endTime": "2025-10-13T12:00:00.000Z"
}
```

**Response:**
```json
{
  "success": true,
  "market": {
    "address": "0x...",
    "description": "Will the demo work?",
    "endTimeISO": "2025-10-13T12:00:00.000Z",
    "yesPool": "0x...",
    "noPool": "0x..."
  }
}
```

---

## Market Operations

### GET /api/markets/:address/pool
Get AMM pool state for a market.

**Parameters:**
- `address` (string): Market contract address

**Response:**
```json
{
  "yesPool": {
    "address": "0x...",
    "name": "YES Shares",
    "symbol": "YES",
    "totalSupply": "13.326659993326659994",
    "reserveUSDC": "14.985",
    "price": "1.124438"
  },
  "noPool": {
    "address": "0x...",
    "name": "NO Shares", 
    "symbol": "NO",
    "totalSupply": "12.302363174505426834",
    "reserveUSDC": "12.991",
    "price": "1.055976"
  },
  "marketInfo": {
    "address": "0x...",
    "description": "Market question",
    "endTime": 1234567890,
    "resolved": false
  }
}
```

### POST /api/markets/:address/bet
Place a bet on a market outcome.

**Parameters:**
- `address` (string): Market contract address

**Request Body:**
```json
{
  "outcome": "YES",
  "usdcAmount": "5"
}
```

**Response:**
```json
{
  "shareTokensReceived": "3.326659993326659994",
  "transactionHash": "0x...",
  "betType": "prediction-bet"
}
```

### POST /api/markets/:address/add-liquidity
Add liquidity to a market pool.

**Parameters:**
- `address` (string): Market contract address

**Request Body:**
```json
{
  "outcome": "YES",
  "usdcAmount": "10"
}
```

**Response:**
```json
{
  "lpTokensReceived": "10000000000000000000",
  "transactionHash": "0x...",
  "poolAddress": "0x..."
}
```

### POST /api/markets/:address/remove-liquidity
Remove liquidity from a market pool.

**Parameters:**
- `address` (string): Market contract address

**Request Body:**
```json
{
  "outcome": "YES",
  "poolTokenAmount": "5000000000000000000"
}
```

**Response:**
```json
{
  "usdcAmount": "5.0",
  "transactionHash": "0x..."
}
```

### POST /api/markets/:address/sell-shares
Sell shares back to the pool.

**Parameters:**
- `address` (string): Market contract address

**Request Body:**
```json
{
  "outcome": "YES",
  "shareAmount": "2.5"
}
```

**Response:**
```json
{
  "usdcReceived": "2.8",
  "transactionHash": "0x..."
}
```

### GET /api/markets/:address/resolution
Get market resolution module information.

**Parameters:**
- `address` (string): Market contract address

**Response:**
```json
{
  "module": "0x...",
  "resolved": false,
  "proposedOutcome": null,
  "challengeEndTime": null
}
```

### POST /api/markets/:address/resolve
Propose or finalize market resolution.

**Parameters:**
- `address` (string): Market contract address

**Request Body:**
```json
{
  "finalWeights": ["1", "0"]
}
```

**Response:**
```json
{
  "success": true
}
```

---

## Position Tracking

### GET /api/positions/my-portfolio
Get current user's complete portfolio.

**Response:**
```json
{
  "user": "0x...",
  "totalValue": "27.976000",
  "markets": ["0x..."],
  "message": "Portfolio tracking - showing current demo market position"
}
```

### GET /api/positions/portfolio/:userAddress
Get specific user's portfolio.

**Parameters:**
- `userAddress` (string): User's wallet address

**Response:**
```json
{
  "user": "0x...",
  "totalValue": "27.976000",
  "markets": ["0x..."],
  "message": "Portfolio tracking - showing current demo market position"
}
```

### GET /api/positions/:marketAddress/my-position
Get current user's position in a specific market.

**Parameters:**
- `marketAddress` (string): Market contract address

**Response:**
```json
{
  "market": {
    "address": "0x...",
    "resolved": false,
    "outcome": null,
    "outcomeText": "PENDING"
  },
  "user": "0x...",
  "positions": {
    "yesShares": {
      "amount": "13.326659993326659994",
      "currentPrice": 1.1244377816725089,
      "currentValue": "14.985000",
      "impliedProbability": "51.57%"
    },
    "noShares": {
      "amount": "12.302363174505426834",
      "currentPrice": 1.05597597922663,
      "currentValue": "12.991000",
      "impliedProbability": "48.43%"
    },
    "total": {
      "currentValue": "27.976000",
      "currency": "USDC"
    }
  },
  "payouts": {
    "ifYesWins": 13.32665999332666,
    "ifNoWins": 12.302363174505427,
    "ifInvalid": 27.976
  },
  "pools": {
    "yesPool": "0x...",
    "noPool": "0x..."
  }
}
```

### GET /api/positions/:marketAddress/portfolio-summary
Get portfolio summary for a specific market.

**Parameters:**
- `marketAddress` (string): Market contract address

**Response:**
```json
{
  "market": {
    "address": "0x...",
    "description": "Market question",
    "resolved": false,
    "outcome": null,
    "endTime": "2025-10-13T01:35:31.000Z",
    "isActive": true,
    "hasPosition": true
  },
  "summary": {
    "primaryPosition": "YES",
    "totalValue": "27.976000",
    "yesShares": "13.326660",
    "noShares": "12.302363",
    "currency": "USDC"
  },
  "status": "ACTIVE"
}
```

### GET /api/positions/:marketAddress/:userAddress
Get specific user's position in a specific market.

**Parameters:**
- `marketAddress` (string): Market contract address
- `userAddress` (string): User's wallet address

**Response:**
Same format as `/my-position` endpoint.

---

## Setup & Configuration

### POST /api/setup
Approve token spending (for USDC approvals).

**Request Body:**
```json
{
  "token": "0x...",
  "spender": "0x...",
  "amount": "1000000000000000000"
}
```

**Response:**
```json
{
  "success": true,
  "allowance": "1000000000000000000"
}
```

### GET /api/setup/balance
Get current wallet balances.

**Response:**
```json
{
  "address": "0x...",
  "ethBalance": "9999.0",
  "usdcBalance": "999904.0",
  "ethBalanceWei": "9999000000000000000000",
  "usdcBalanceRaw": "999904000000"
}
```

### POST /api/setup/mint
Mint test USDC tokens (for testing).

**Response:**
```json
{
  "success": true,
  "balance": "1000000000000000000000"
}
```

---

## Debug & Testing

### GET /api/debug/factory
Get factory contract information and test functions.

**Response:**
```json
{
  "address": "0x...",
  "functions": {
    "owner": {
      "success": true,
      "value": "0x..."
    },
    "usdc": {
      "success": true,
      "value": "0x..."
    },
    "marketsCount": {
      "success": true,
      "value": "1"
    },
    "allMarkets": {
      "success": true,
      "value": ["0x..."],
      "count": 1
    }
  }
}
```

### GET /api/debug/usdc
Get USDC contract information and wallet balances.

**Response:**
```json
{
  "contract": "0x...",
  "wallet": "0x...",
  "factory": "0x...",
  "deployed": true,
  "codeLength": 12345,
  "name": "USD Coin",
  "symbol": "USDC",
  "decimals": "6",
  "totalSupply": "1000000000000000",
  "balance": "999904000000",
  "allowance": "115792089237316195423570985008687907853269984665640564039457584007913129639935"
}
```

### GET /api/debug/market/:address
Get detailed market contract information.

**Parameters:**
- `address` (string): Market contract address

**Response:**
```json
{
  "address": "0x...",
  "deployed": true,
  "codeLength": 12345,
  "functions": {
    "description": {
      "success": true,
      "value": "Market question",
      "type": "string"
    },
    "endTime": {
      "success": true,
      "value": "1234567890",
      "type": "bigint"
    },
    "resolved": {
      "success": true,
      "value": "false",
      "type": "boolean"
    }
  },
  "proxy": {
    "uuid": "0x..."
  }
}
```

### GET /api/debug/balance
Get current wallet ETH and USDC balances.

**Response:**
```json
{
  "address": "0x...",
  "ethBalance": "9999.0",
  "usdcBalance": "999904.0"
}
```

---

## Events

### GET /api/events/market/:address
Get event logs for a specific market.

**Parameters:**
- `address` (string): Market contract address

**Response:**
```json
{
  "market": "0x...",
  "totalLogs": 5,
  "factoryLogs": 2,
  "decodedLogs": [
    {
      "address": "0x...",
      "blockNumber": 123,
      "transactionHash": "0x...",
      "eventName": "MarketCreated",
      "args": ["0x...", "Market question", "1234567890"]
    }
  ],
  "marketRelatedLogs": [
    {
      "address": "0x...",
      "blockNumber": 123,
      "transactionHash": "0x...",
      "eventName": "MarketCreated", 
      "args": ["0x...", "Market question", "1234567890"]
    }
  ]
}
```

---

## Factory Operations

### POST /api/factory/initialize
Initialize the market factory contract.

**Response:**
```json
{
  "success": true
}
```

---

## Health Check

### GET /health
Basic health check endpoint.

**Response:**
```json
{
  "status": "healthy"
}
```

---

## Error Responses

All endpoints may return error responses in the following format:

**HTTP 400 - Bad Request:**
```json
{
  "error": "Missing required parameters: outcome, usdcAmount"
}
```

**HTTP 500 - Internal Server Error:**
```json
{
  "error": "Contract execution failed"
}
```

---

## Notes

1. **Transaction Delays**: The system implements transaction delays to prevent nonce conflicts. Expect some operations to take 5-12 seconds.

2. **Price Calculations**: The system uses manual price calculations (`reserve / totalSupply`) instead of the AMM contract's `getPrice()` function due to a Solidity integer division precision bug.

3. **Demo Market**: Some portfolio endpoints are currently hardcoded to work with a demo market address for testing purposes.

4. **Wallet Configuration**: All endpoints that modify state require a configured wallet. The system uses a NonceManager for automatic nonce sequencing.

5. **USDC Decimals**: USDC uses 6 decimals, while share tokens use 18 decimals. The API handles this conversion automatically.

6. **Address Validation**: All address parameters are validated for proper Ethereum address format.
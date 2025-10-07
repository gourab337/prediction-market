# Loaf Markets Backend

## Overview
Backend server for the Loaf Markets application, handling market creation, liquidity provision, and trading operations.

## Environment Setup
1. Create a `.env` file based on `.env.example`
2. Fill in your environment variables

## Installation
```bash
npm install
```

## Development
```bash
npm run dev
```

## Production Build
```bash
npm run build
npm start
```

## Configuration
The server uses the following environment variables:
- `PORT`: Server port (default: 3000)
- `ABSTRACT_RPC_URL`: Abstract testnet RPC URL
- `CHAIN_ID`: Abstract testnet chain ID (11124)
- `MARKET_FACTORY_ADDRESS`: Deployed MarketFactory contract address
- `MARKET_IMPL_ADDRESS`: Deployed Market implementation address
- `USDC_ADDRESS`: USDC token contract address
- `PRIVATE_KEY`: (Optional) Private key for signing transactions
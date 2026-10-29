# dibVarse Index — AI stocks, one index, on Robinhood Chain

dibVarse lets anyone take ETH-settled exposure to a basket of assets (e.g. tokenized AI stocks) on [Robinhood Chain](https://docs.robinhood.com/chain/connecting), an EVM Arbitrum Orbit L2 with ETH gas.

- **One index, many assets.** Each index is a weighted basket priced by Chainlink-compatible oracles. It launches at **1,000** and moves with the weighted return of its components.
- **ETH in, ETH out.** Deposit ETH to open a position; on close you get `principal × exit level ÷ entry level`, capped at a max payout (default 3×), minus a small fee.
- **Always solvent.** The vault's ETH reserves are the counterparty. Every open position locks enough reserves for its maximum payout. *Effective reserves* is what is left to back new positions.
- **Valid price guard.** Trading only happens when every component price is fresh. If prices stay stale too long, users can take their principal back with an emergency refund.
- **Per-wallet principal limit** to keep exposure small while the product is young.

```
contracts/   Solidity + Hardhat (IndexVault, MockPriceFeed, tests, deploy + price keeper scripts)
web/         Vite + React + wagmi/viem frontend (Home, Trade, My positions, Transactions, Rules)
```

## Default parameters

| Parameter | Default | Meaning |
|---|---|---|
| Fee | 0.3% | on open (principal) and on close (payout), paid to reserves |
| Max payout | 3× principal | caps gains so reserves can always settle |
| Wallet principal limit | 0.2 ETH | per wallet, per index |
| Minimum position | 0.001 ETH | |
| Max price age | 1 day | older answers make the price "stale" and pause trading |
| Emergency delay | 3 days | stale time after which principal can be refunded |

Change them at deploy time (`contracts/.env`) or later with `setParams`. The max payout can't change while positions are open.

## Run locally

```bash
cd contracts && npm install && npm test
```

```bash
cd contracts && npx hardhat node
```

In a second terminal: deploy the vault, 5 mock price feeds (NVDA, MSFT, GOOGL, AMZN, META) and the first index, then move prices a few times:

```bash
cd contracts && npm run deploy:local
```

```bash
cd contracts && npm run prices:local
```

Then start the web app with `VITE_CHAIN=local` and the printed `VITE_VAULT_ADDRESS` in `web/.env`:

```bash
cd web && npm install && npm run dev
```

## Deploy to Robinhood Chain testnet

1. Get testnet ETH from `faucet.testnet.chain.robinhood.com`.
2. Copy `contracts/.env.example` to `contracts/.env` and set `PRIVATE_KEY`. The testnet RPC defaults to the public `https://rpc.testnet.chain.robinhood.com`. `RESERVE_ETH` (default 0.1) is sent to the vault as reserves.
3. Deploy:
   ```bash
   cd contracts && npm run deploy:testnet
   ```
   Without `FEEDS`, this deploys mock price feeds. Keep them fresh (otherwise the index shows "Stale price" after `MAX_PRICE_AGE`), e.g. every 5 minutes:
   ```bash
   cd contracts && LOOP_SECONDS=300 npm run prices:testnet
   ```
4. Set the web app's variables (in `web/.env`, or Vercel → Settings → Environment Variables): `VITE_CHAIN=testnet`, `VITE_VAULT_ADDRESS`, `VITE_VAULT_FROM_BLOCK`. Then redeploy.

### Real price feeds

For production, set `FEEDS` (comma-separated Chainlink-compatible aggregator addresses) and `WEIGHTS` (basis points summing to 10000) before deploying, and tune `MAX_PRICE_AGE` to the feeds' heartbeat. Stock feeds don't update outside market hours, so trading pauses then by design.

### Hosting on Vercel

Set **Root Directory** to `web`. `web/vercel.json` makes page refreshes on routes like `/trade` work. Vite bakes environment variables into the build, so redeploy after changing them. Until `VITE_VAULT_ADDRESS` is set, visitors see a "Launching soon" banner.

## Risks and notes

- **Oracle latency.** Users trade at the latest oracle price. Fees, the wallet limit and the payout cap limit what someone can extract by trading just before a known price update. Use fast, reliable feeds on mainnet.
- **Reserves can lose money** when the index rises. Size `RESERVE_ETH` and the wallet limit together.
- **Regulation.** Tokenized stocks are securities in many countries. Get legal advice before offering this with real funds.
- The contracts have not been audited.

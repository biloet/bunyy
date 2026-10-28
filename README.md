# bunyy 🐰 — token launchpad on Robinhood Chain

A pump.fun-style launchpad for [Robinhood Chain](https://docs.robinhood.com/chain/connecting) (an EVM Arbitrum Orbit L2, gas paid in ETH).

- **Anyone can launch a token** with a name, ticker, image and description, and can do an optional first buy in the same transaction.
- **Fair launch on a bonding curve.** Every token trades against ETH on a constant-product curve with virtual reserves. There is no presale and no team allocation.
- **Graduation to a DEX.** When the curve's sale supply sells out, the raised ETH plus the reserved tokens are added as liquidity to a Uniswap V2-compatible DEX at the curve's final price. The LP tokens are burned, so the liquidity is locked forever.
- **Anti-sniping of the DEX pool.** Wallet-to-wallet transfers stay locked until graduation, so nobody can seed the DEX pair at a bad price first.

```
contracts/   Solidity + Hardhat (Launchpad, LaunchToken, tests, deploy script)
web/         Vite + React + wagmi/viem frontend
```

## How the curve works (default parameters)

| Parameter | Default | Meaning |
|---|---|---|
| Total supply | 1,000,000,000 | minted per token |
| Sale supply | 800,000,000 | sold on the curve |
| Virtual ETH / virtual tokens | 1 ETH / 1,073,000,000 | starting reserves, which set the starting price |
| Trade fee | 1% | on every buy/sell, sent to the fee recipient |
| Creation fee | 0 ETH | |
| Migration fee | 0.05 ETH | taken from the raised ETH at graduation |

With these defaults a curve raises **≈2.93 ETH** before graduating, at a market cap of **≈14.4 ETH**. All values can be changed at deploy time (`contracts/.env`) or later with `setParams`. Changes only affect new launches. The owner can never touch ETH held by a curve.

## Run locally

```bash
cd contracts && npm install && npm test
```

```bash
cd contracts && npx hardhat node
```

In a second terminal (local deploys also deploy a mock WETH + DEX so graduation works):

```bash
cd contracts && npm run deploy:local
```

```bash
cd web && npm install && cp .env.example .env
```

Set `VITE_CHAIN=local` and the `VITE_LAUNCHPAD_ADDRESS` printed by the deploy, then:

```bash
cd web && npm run dev
```

Import a Hardhat test account into MetaMask and add the network `http://127.0.0.1:8545` (chain ID 31337).

## Deploy to Robinhood Chain testnet

1. Get testnet ETH from the faucet (`faucet.testnet.chain.robinhood.com`) or bridge from Sepolia.
2. Get an RPC URL, e.g. Alchemy: `https://robinhood-testnet.g.alchemy.com/v2/<API_KEY>`.
3. Copy `contracts/.env.example` to `contracts/.env` and fill in `PRIVATE_KEY` and `ROBINHOOD_TESTNET_RPC_URL`. To have curves graduate automatically, also fill in `DEX_FACTORY` and `WETH` (a Uniswap V2-compatible factory and the wrapped ETH on the chain).
4. Deploy:
   ```bash
   cd contracts && npm run deploy:testnet
   ```
5. Copy `web/.env.example` to `web/.env`, set `VITE_CHAIN=testnet`, `VITE_RPC_URL`, and the printed `VITE_LAUNCHPAD_ADDRESS` / `VITE_LAUNCHPAD_FROM_BLOCK`, then build:
   ```bash
   cd web && npm run build
   ```
   `web/dist` is a static site and can be hosted anywhere (Vercel, Netlify, Cloudflare Pages…).

If no DEX is configured, a curve still completes when it sells out but waits. Once the owner calls `setDex(factory, weth)`, anyone can press **Migrate liquidity to DEX** on the token page (or call `migrate(token)`).

Mainnet (chain ID 4663) works the same way with `npm run deploy:mainnet`. Get the contracts audited before putting real funds in them.

## Notes

- The compiler is the `solc` npm package (solcjs 0.8.24), so `hardhat compile` never needs to download a compiler.
- The frontend reads trades from `Trade` event logs starting at `VITE_LAUNCHPAD_FROM_BLOCK`. Some RPC providers cap `eth_getLogs` ranges; for a busy launchpad, add an indexer (e.g. a subgraph or Ponder).
- Token images are URLs (`https://` or `ipfs://`) stored on-chain; uploading to IPFS is left to the creator.

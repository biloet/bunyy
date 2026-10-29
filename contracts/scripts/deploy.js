// Deploys IndexVault, creates the first index and funds reserves.
// Configure via environment variables (see .env.example).
const fs = require("fs");
const path = require("path");
const hre = require("hardhat");
const { exportAbi } = require("./export-abi");

const { ethers, network } = hre;
const env = (k, d) => (process.env[k] && process.env[k].trim()) || d;
const isLocal = network.name === "hardhat" || network.name === "localhost";

// Demo components used when no real feeds are configured. Starting prices are placeholders.
const DEMO_ASSETS = [
  { symbol: "NVDA", price: 180 },
  { symbol: "MSFT", price: 510 },
  { symbol: "GOOGL", price: 250 },
  { symbol: "AMZN", price: 230 },
  { symbol: "META", price: 750 },
];

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log(`Network: ${network.name}\nDeployer: ${deployer.address}`);

  const params = {
    feeBps: Number(env("FEE_BPS", "30")),
    maxPayoutBps: Number(env("MAX_PAYOUT_BPS", "30000")),
    minPrincipal: ethers.parseEther(env("MIN_PRINCIPAL", "0.001")),
    walletPrincipalLimit: ethers.parseEther(env("WALLET_PRINCIPAL_LIMIT", "0.2")),
    maxPriceAge: Number(env("MAX_PRICE_AGE", "86400")),
    emergencyDelay: Number(env("EMERGENCY_DELAY", String(3 * 86400))),
  };

  const vault = await ethers.deployContract("IndexVault", [params]);
  await vault.waitForDeployment();
  const address = await vault.getAddress();
  const receipt = await vault.deploymentTransaction().wait();
  console.log(`IndexVault: ${address} (block ${receipt.blockNumber})`);

  // Components: real feeds from FEEDS/WEIGHTS, or mock feeds for a demo index.
  let feeds = env("FEEDS", "").split(",").map((s) => s.trim()).filter(Boolean);
  let weights = env("WEIGHTS", "").split(",").map((s) => Number(s.trim())).filter(Boolean);
  const mocks = [];
  if (feeds.length === 0) {
    console.log("FEEDS not set: deploying mock price feeds (testnet/demo only).");
    for (const a of DEMO_ASSETS) {
      const feed = await ethers.deployContract("MockPriceFeed", [`${a.symbol} / USD`, 8, BigInt(a.price * 1e8)]);
      await feed.waitForDeployment();
      const addr = await feed.getAddress();
      mocks.push({ symbol: a.symbol, address: addr });
      feeds.push(addr);
      console.log(`  ${a.symbol} feed: ${addr}`);
    }
    weights = DEMO_ASSETS.map(() => 10_000 / DEMO_ASSETS.length);
  }
  if (weights.length !== feeds.length) throw new Error("WEIGHTS must have one entry per feed");

  await (
    await vault.createIndex(
      env("INDEX_NAME", "dibVarse AI Index"),
      env("INDEX_SYMBOL", "AIX"),
      env("INDEX_DESCRIPTION", "Five AI leaders. One index."),
      feeds,
      weights,
    )
  ).wait();
  console.log("Index 0 created.");

  const reserve = ethers.parseEther(env("RESERVE_ETH", isLocal ? "10" : "0.1"));
  if (reserve > 0n) {
    await (await vault.fundReserves({ value: reserve })).wait();
    console.log(`Reserves funded: ${ethers.formatEther(reserve)} ETH`);
  }

  const chainId = Number((await ethers.provider.getNetwork()).chainId);
  const deployment = { network: network.name, chainId, address, blockNumber: receipt.blockNumber, mockFeeds: mocks };
  const dir = path.join(__dirname, "..", "deployments");
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, `${network.name}.json`), JSON.stringify(deployment, null, 2) + "\n");

  exportAbi();
  console.log(`\nSet these in web/.env (or Vercel):\nVITE_VAULT_ADDRESS=${address}\nVITE_VAULT_FROM_BLOCK=${receipt.blockNumber}`);
  if (mocks.length) console.log(`\nKeep mock prices fresh with: npx hardhat run scripts/push-prices.js --network ${network.name}`);
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});

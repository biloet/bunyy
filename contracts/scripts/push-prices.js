// Keeper for mock feeds: nudges each mock price (small random walk) and records a checkpoint
// for every index, so the index stays "valid" and the chart gets points.
// Set LOOP_SECONDS to keep running, e.g. LOOP_SECONDS=300.
const fs = require("fs");
const path = require("path");
const hre = require("hardhat");

const { ethers, network } = hre;

async function tick(vault, feeds) {
  for (const f of feeds) {
    const feed = await ethers.getContractAt("MockPriceFeed", f.address);
    const [, answer] = await feed.latestRoundData();
    const move = 1 + (Math.random() - 0.48) * 0.012; // about ±0.6%, slight upward drift
    const next = BigInt(Math.max(1, Math.round(Number(answer) * move)));
    await (await feed.setPrice(next)).wait();
    console.log(`${f.symbol}: ${Number(answer) / 1e8} -> ${Number(next) / 1e8}`);
  }
  const count = Number(await vault.indexCount());
  for (let i = 0; i < count; i++) {
    await (await vault.checkpoint(i)).wait();
    const [level] = await vault.indexLevel(i);
    console.log(`index ${i} level: ${ethers.formatEther(level)}`);
  }
}

async function main() {
  const file = path.join(__dirname, "..", "deployments", `${network.name}.json`);
  const deployment = JSON.parse(fs.readFileSync(file, "utf8"));
  if (!deployment.mockFeeds?.length) throw new Error("This deployment has no mock feeds to update.");
  const vault = await ethers.getContractAt("IndexVault", deployment.address);
  const loop = Number(process.env.LOOP_SECONDS || 0);
  do {
    await tick(vault, deployment.mockFeeds);
    if (loop) await new Promise((r) => setTimeout(r, loop * 1000));
  } while (loop);
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});

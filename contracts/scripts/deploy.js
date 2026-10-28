// Deploys the Launchpad and writes its address + ABI for the web app.
// Configure via environment variables (see .env.example).
const fs = require("fs");
const path = require("path");
const hre = require("hardhat");
const { exportAbi } = require("./export-abi");

const { ethers, network } = hre;
const env = (k, d) => (process.env[k] && process.env[k].trim()) || d;

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log(`Network: ${network.name} (chainId ${network.config.chainId ?? "local"})`);
  console.log(`Deployer: ${deployer.address}`);

  const params = {
    totalSupply: ethers.parseEther(env("TOTAL_SUPPLY", "1000000000")),
    saleSupply: ethers.parseEther(env("SALE_SUPPLY", "800000000")),
    virtualEth: ethers.parseEther(env("VIRTUAL_ETH", "1")),
    virtualToken: ethers.parseEther(env("VIRTUAL_TOKEN", "1073000000")),
    tradeFeeBps: Number(env("TRADE_FEE_BPS", "100")),
    creationFee: ethers.parseEther(env("CREATION_FEE", "0")),
    migrationFee: ethers.parseEther(env("MIGRATION_FEE", "0.05")),
  };

  let dexFactory = env("DEX_FACTORY", ethers.ZeroAddress);
  let weth = env("WETH", ethers.ZeroAddress);
  if (network.name === "hardhat" || network.name === "localhost") {
    // Local chain has no DEX: deploy the test doubles so graduation can be exercised.
    weth = await (await ethers.deployContract("MockWETH")).getAddress();
    dexFactory = await (await ethers.deployContract("MockFactory")).getAddress();
    console.log(`Mock WETH: ${weth}\nMock DEX factory: ${dexFactory}`);
  } else if (dexFactory === ethers.ZeroAddress || weth === ethers.ZeroAddress) {
    console.warn("DEX_FACTORY/WETH not set: curves will complete but not migrate until setDex() is called.");
  }

  const launchpad = await ethers.deployContract("Launchpad", [
    params,
    env("FEE_RECIPIENT", deployer.address),
    dexFactory,
    weth,
  ]);
  await launchpad.waitForDeployment();
  const address = await launchpad.getAddress();
  const receipt = await launchpad.deploymentTransaction().wait();
  console.log(`Launchpad: ${address} (block ${receipt.blockNumber})`);

  const chainId = Number((await ethers.provider.getNetwork()).chainId);
  const deployment = { network: network.name, chainId, address, blockNumber: receipt.blockNumber, dexFactory, weth };
  const dir = path.join(__dirname, "..", "deployments");
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, `${network.name}.json`), JSON.stringify(deployment, null, 2) + "\n");

  exportAbi();
  console.log(`\nSet these in web/.env:\nVITE_LAUNCHPAD_ADDRESS=${address}\nVITE_LAUNCHPAD_FROM_BLOCK=${receipt.blockNumber}`);
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});

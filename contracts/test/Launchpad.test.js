const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

const E = (n) => ethers.parseEther(String(n));
const DEAD = "0x000000000000000000000000000000000000dEaD";

const PARAMS = {
  totalSupply: E(1_000_000_000),
  saleSupply: E(800_000_000),
  virtualEth: E(1),
  virtualToken: E(1_073_000_000),
  tradeFeeBps: 100,
  creationFee: 0n,
  migrationFee: E(0.1),
};

async function deploy() {
  const [owner, feeTo, alice, bob] = await ethers.getSigners();
  const weth = await ethers.deployContract("MockWETH");
  const factory = await ethers.deployContract("MockFactory");
  const launchpad = await ethers.deployContract("Launchpad", [
    PARAMS,
    feeTo.address,
    await factory.getAddress(),
    await weth.getAddress(),
  ]);
  return { owner, feeTo, alice, bob, weth, factory, launchpad };
}

async function create(launchpad, signer, value = 0n) {
  const tx = await launchpad.connect(signer).createToken("Bunny", "BUNY", "https://img/x.png", "hop", 0, { value });
  const rc = await tx.wait();
  const ev = rc.logs.map((l) => { try { return launchpad.interface.parseLog(l); } catch { return null; } })
    .find((e) => e && e.name === "TokenCreated");
  return ethers.getContractAt("LaunchToken", ev.args.token);
}

describe("Launchpad", function () {
  it("creates a token with the full supply held by the launchpad", async () => {
    const { launchpad, alice } = await loadFixture(deploy);
    const token = await create(launchpad, alice);
    expect(await token.balanceOf(await launchpad.getAddress())).to.equal(PARAMS.totalSupply);
    expect(await launchpad.tokenCount()).to.equal(1);
    const c = await launchpad.getCurve(await token.getAddress());
    expect(c.creator).to.equal(alice.address);
    expect(c.realToken).to.equal(PARAMS.saleSupply);
    expect(c.imageURI).to.equal("https://img/x.png");
  });

  it("validates metadata and creation fee", async () => {
    const { launchpad, owner, alice } = await loadFixture(deploy);
    await expect(launchpad.createToken("", "X", "", "", 0)).to.be.revertedWithCustomError(launchpad, "InvalidMetadata");
    await expect(launchpad.createToken("Name", "TOOLONGSYMBOL", "", "", 0)).to.be.revertedWithCustomError(launchpad, "InvalidMetadata");
    await launchpad.connect(owner).setParams({ ...PARAMS, creationFee: E(0.01) });
    await expect(launchpad.connect(alice).createToken("A", "A", "", "", 0, { value: E(0.005) }))
      .to.be.revertedWithCustomError(launchpad, "InsufficientPayment");
  });

  it("supports an initial buy on creation and charges the creation fee", async () => {
    const { launchpad, owner, feeTo, alice } = await loadFixture(deploy);
    await launchpad.connect(owner).setParams({ ...PARAMS, creationFee: E(0.01) });
    const before = await ethers.provider.getBalance(feeTo.address);
    const token = await create(launchpad, alice, E(0.11));
    expect(await token.balanceOf(alice.address)).to.be.gt(0);
    // creation fee + 1% trade fee on ~0.099 ETH
    expect((await ethers.provider.getBalance(feeTo.address)) - before).to.be.closeTo(E(0.01) + E(0.00099), E(0.000001));
  });

  it("buys along the curve, matching quotes and raising the price", async () => {
    const { launchpad, alice, bob } = await loadFixture(deploy);
    const token = await create(launchpad, alice);
    const addr = await token.getAddress();
    const p0 = await launchpad.currentPrice(addr);
    const [quoted, cost, fee] = await launchpad.quoteBuy(addr, E(0.5));
    await expect(launchpad.connect(bob).buy(addr, quoted, { value: E(0.5) }))
      .to.emit(launchpad, "Trade");
    expect(await token.balanceOf(bob.address)).to.equal(quoted);
    expect(cost).to.be.lte(E(0.5));
    expect(fee).to.equal(((cost - fee) * 100n) / 10_000n);
    expect(await launchpad.currentPrice(addr)).to.be.gt(p0);
  });

  it("enforces slippage on buy and sell", async () => {
    const { launchpad, alice, bob } = await loadFixture(deploy);
    const token = await create(launchpad, alice);
    const addr = await token.getAddress();
    const [quoted] = await launchpad.quoteBuy(addr, E(0.1));
    await expect(launchpad.connect(bob).buy(addr, quoted + 1n, { value: E(0.1) }))
      .to.be.revertedWithCustomError(launchpad, "Slippage");
    await launchpad.connect(bob).buy(addr, 0, { value: E(0.1) });
    const bal = await token.balanceOf(bob.address);
    const [ethOut] = await launchpad.quoteSell(addr, bal);
    await expect(launchpad.connect(bob).sell(addr, bal, ethOut + 1n))
      .to.be.revertedWithCustomError(launchpad, "Slippage");
  });

  it("sells without approval and never pays out more than was put in", async () => {
    const { launchpad, alice, bob } = await loadFixture(deploy);
    const token = await create(launchpad, alice);
    const addr = await token.getAddress();
    await launchpad.connect(bob).buy(addr, 0, { value: E(1) });
    const bal = await token.balanceOf(bob.address);
    const [ethOut] = await launchpad.quoteSell(addr, bal);
    await expect(launchpad.connect(bob).sell(addr, bal, ethOut)).to.changeEtherBalance(bob, ethOut, { includeFee: false });
    expect(ethOut).to.be.lt(E(1));
    expect(await token.balanceOf(bob.address)).to.equal(0);
    const c = await launchpad.getCurve(addr);
    expect(c.realToken).to.equal(PARAMS.saleSupply);
    expect(await ethers.provider.getBalance(await launchpad.getAddress())).to.equal(c.realEth);
  });

  it("locks wallet-to-wallet transfers until graduation", async () => {
    const { launchpad, alice, bob } = await loadFixture(deploy);
    const token = await create(launchpad, alice);
    await launchpad.connect(bob).buy(await token.getAddress(), 0, { value: E(0.1) });
    await expect(token.connect(bob).transfer(alice.address, 1)).to.be.revertedWithCustomError(token, "TransfersLocked");
  });

  it("graduates: refunds excess, adds liquidity at the final price and burns LP", async () => {
    const { launchpad, factory, weth, feeTo, alice, bob } = await loadFixture(deploy);
    const token = await create(launchpad, alice);
    const addr = await token.getAddress();
    const feeBefore = await ethers.provider.getBalance(feeTo.address);

    const [tokensOut, cost] = await launchpad.quoteBuy(addr, E(10));
    expect(tokensOut).to.equal(PARAMS.saleSupply);
    const tx = launchpad.connect(bob).buy(addr, 0, { value: E(10) });
    await expect(tx).to.changeEtherBalance(bob, -cost, { includeFee: false });
    await expect(tx).to.emit(launchpad, "CurveCompleted").and.to.emit(launchpad, "Migrated");

    const c = await launchpad.getCurve(addr);
    expect(c.complete).to.equal(true);
    expect(c.migrated).to.equal(true);
    expect(await token.tradingOpen()).to.equal(true);

    const pair = await ethers.getContractAt("MockPair", await factory.getPair(addr, await weth.getAddress()));
    const pairWeth = await weth.balanceOf(await pair.getAddress());
    const pairTok = await token.balanceOf(await pair.getAddress());
    expect(await pair.balanceOf(DEAD)).to.be.gt(0);
    // Pool price equals the curve's final price.
    const curvePrice = (c.virtualEth * E(1)) / c.virtualToken;
    expect((pairWeth * E(1)) / pairTok).to.be.closeTo(curvePrice, curvePrice / 1_000_000n);
    // Every token is accounted for and the launchpad holds nothing.
    const lp = await launchpad.getAddress();
    expect(await token.balanceOf(lp)).to.equal(0);
    expect(await ethers.provider.getBalance(lp)).to.equal(0);
    expect(pairTok + (await token.balanceOf(DEAD)) + (await token.balanceOf(bob.address))).to.equal(PARAMS.totalSupply);
    // Trade fee + migration fee went to the fee recipient.
    expect((await ethers.provider.getBalance(feeTo.address)) - feeBefore).to.be.gte(PARAMS.migrationFee);

    // Curve trading is closed, transfers are open.
    await expect(launchpad.connect(bob).buy(addr, 0, { value: E(1) })).to.be.revertedWithCustomError(launchpad, "CurveComplete");
    await token.connect(bob).transfer(alice.address, 1);
  });

  it("keeps the buy if migration fails and lets anyone migrate later", async () => {
    const { launchpad, owner, factory, weth, alice, bob } = await loadFixture(deploy);
    const token = await create(launchpad, alice);
    const addr = await token.getAddress();
    const rejecter = await ethers.deployContract("RejectingReceiver");
    await launchpad.connect(owner).setFeeRecipient(await rejecter.getAddress());
    await launchpad.connect(owner).setParams({ ...PARAMS, tradeFeeBps: 0 });
    // Fee recipient rejects ETH -> migration fee transfer fails -> migration reverts, buy survives.
    await expect(launchpad.connect(bob).buy(addr, 0, { value: E(10) })).to.emit(launchpad, "CurveCompleted");
    let c = await launchpad.getCurve(addr);
    expect(c.complete).to.equal(true);
    expect(c.migrated).to.equal(false);

    await launchpad.connect(owner).setFeeRecipient(owner.address);
    await expect(launchpad.connect(alice).migrate(addr)).to.emit(launchpad, "Migrated");
    await expect(launchpad.migrate(addr)).to.be.revertedWithCustomError(launchpad, "AlreadyMigrated");
  });

  it("does not migrate when no DEX is configured", async () => {
    const { launchpad, owner, alice, bob } = await loadFixture(deploy);
    await launchpad.connect(owner).setDex(ethers.ZeroAddress, ethers.ZeroAddress);
    const token = await create(launchpad, alice);
    const addr = await token.getAddress();
    await launchpad.connect(bob).buy(addr, 0, { value: E(10) });
    await expect(launchpad.migrate(addr)).to.be.revertedWithCustomError(launchpad, "DexNotConfigured");
  });

  it("survives WETH donated to the pair before migration", async () => {
    const { launchpad, factory, weth, alice, bob } = await loadFixture(deploy);
    const token = await create(launchpad, alice);
    const addr = await token.getAddress();
    await factory.createPair(addr, await weth.getAddress());
    const pair = await factory.getPair(addr, await weth.getAddress());
    await weth.connect(alice).deposit({ value: E(1) });
    await weth.connect(alice).transfer(pair, E(1));
    await expect(launchpad.connect(bob).buy(addr, 0, { value: E(10) })).to.emit(launchpad, "Migrated");
  });

  it("restricts admin functions and validates params", async () => {
    const { launchpad, alice } = await loadFixture(deploy);
    await expect(launchpad.connect(alice).setParams(PARAMS)).to.be.revertedWithCustomError(launchpad, "OwnableUnauthorizedAccount");
    await expect(launchpad.setParams({ ...PARAMS, tradeFeeBps: 501 })).to.be.revertedWithCustomError(launchpad, "InvalidParams");
    await expect(launchpad.setParams({ ...PARAMS, virtualToken: PARAMS.saleSupply })).to.be.revertedWithCustomError(launchpad, "InvalidParams");
    await expect(launchpad.migrateFromSelf(ethers.ZeroAddress)).to.be.revertedWithCustomError(launchpad, "OnlySelf");
  });

  it("pages tokens newest first", async () => {
    const { launchpad, alice } = await loadFixture(deploy);
    const a = await create(launchpad, alice);
    const b = await create(launchpad, alice);
    expect(await launchpad.getTokens(0, 10)).to.deep.equal([await b.getAddress(), await a.getAddress()]);
    expect(await launchpad.getTokens(1, 10)).to.deep.equal([await a.getAddress()]);
    expect(await launchpad.getTokens(5, 10)).to.deep.equal([]);
  });
});

const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture, time } = require("@nomicfoundation/hardhat-network-helpers");

const E = (n) => ethers.parseEther(String(n));
const L = (n) => ethers.parseEther(String(n)); // index levels use 18 decimals
const P = (usd) => BigInt(Math.round(usd * 1e8)); // 8-decimal feed answers

const PARAMS = {
  feeBps: 30,
  maxPayoutBps: 30_000,
  minPrincipal: E(0.001),
  walletPrincipalLimit: E(0.2),
  maxPriceAge: 3600,
  emergencyDelay: 3 * 86400,
};

async function deploy() {
  const [owner, alice, bob] = await ethers.getSigners();
  const vault = await ethers.deployContract("IndexVault", [PARAMS]);
  const prices = [100, 200, 50, 400, 25];
  const feeds = [];
  for (const [i, p] of prices.entries()) {
    feeds.push(await ethers.deployContract("MockPriceFeed", [`ASSET${i} / USD`, 8, P(p)]));
  }
  await vault.createIndex("AI Leaders", "AIX", "Five AI stocks", await Promise.all(feeds.map((f) => f.getAddress())), [2000, 2000, 2000, 2000, 2000]);
  await vault.fundReserves({ value: E(2) });
  return { owner, alice, bob, vault, feeds, prices };
}

async function setAll(feeds, prices, mult) {
  for (const [i, f] of feeds.entries()) await f.setPrice(P(prices[i] * mult));
}

const openTx = async (vault, signer, value) => {
  const tx = await vault.connect(signer).open(0, 0, { value });
  const rc = await tx.wait();
  return vault.interface.parseLog(rc.logs.find((l) => vault.interface.parseLog(l)?.name === "PositionOpened")).args;
};

describe("IndexVault", function () {
  it("launches at level 1000 and tracks the weighted return", async () => {
    const { vault, feeds, prices } = await loadFixture(deploy);
    let [level, valid] = await vault.indexLevel(0);
    expect(level).to.equal(L(1000));
    expect(valid).to.equal(true);
    await setAll(feeds, prices, 1.1);
    [level] = await vault.indexLevel(0);
    expect(level).to.be.closeTo(L(1100), L(0.000001));
    // Only one component (20%) doubles -> +20%
    await setAll(feeds, prices, 1);
    await feeds[0].setPrice(P(prices[0] * 2));
    [level] = await vault.indexLevel(0);
    expect(level).to.be.closeTo(L(1200), L(0.000001));
  });

  it("opens a position, taking the fee into reserves and locking the max payout", async () => {
    const { vault, alice } = await loadFixture(deploy);
    const pos = await openTx(vault, alice, E(0.1003));
    expect(pos.principal).to.be.closeTo(E(0.1), 10n);
    expect(pos.entryLevel).to.equal(L(1000));
    expect(await vault.totalOpenInterest()).to.equal(pos.principal);
    expect(await vault.reserves()).to.equal(E(2) + pos.fee);
    expect(await vault.lockedReserves()).to.be.closeTo(E(0.2), 10n);
    expect(await vault.positionsOf(alice.address)).to.deep.equal([pos.positionId]);
  });

  it("pays gains from reserves on close", async () => {
    const { vault, feeds, prices, alice } = await loadFixture(deploy);
    const pos = await openTx(vault, alice, E(0.1003));
    await setAll(feeds, prices, 1.5);
    const [quote] = await vault.quoteClose(pos.positionId);
    const gross = (pos.principal * 15n) / 10n;
    expect(quote).to.be.closeTo(gross - (gross * 30n) / 10_000n, 10n);
    const reservesBefore = await vault.reserves();
    await expect(vault.connect(alice).close(pos.positionId, quote)).to.changeEtherBalance(alice, quote, { includeFee: false });
    expect(await vault.reserves()).to.be.closeTo(reservesBefore - (gross - pos.principal) + (gross - quote), 10n);
    expect(await vault.lockedReserves()).to.equal(0);
    expect(await vault.totalOpenInterest()).to.equal(0);
    expect(await ethers.provider.getBalance(await vault.getAddress())).to.equal(await vault.reserves());
  });

  it("keeps losses in reserves on close", async () => {
    const { vault, feeds, prices, alice } = await loadFixture(deploy);
    const pos = await openTx(vault, alice, E(0.1003));
    await setAll(feeds, prices, 0.8);
    const [quote] = await vault.quoteClose(pos.positionId);
    await vault.connect(alice).close(pos.positionId, 0);
    expect(quote).to.be.lt(pos.principal);
    expect(await ethers.provider.getBalance(await vault.getAddress())).to.equal(await vault.reserves());
    expect(await vault.reserves()).to.be.gt(E(2));
  });

  it("caps the payout at maxPayoutBps", async () => {
    const { vault, feeds, prices, alice } = await loadFixture(deploy);
    const pos = await openTx(vault, alice, E(0.1003));
    await setAll(feeds, prices, 10);
    const [quote] = await vault.quoteClose(pos.positionId);
    const cap = pos.principal * 3n;
    expect(quote).to.equal(cap - (cap * 30n) / 10_000n);
  });

  it("enforces the wallet principal limit, minimum and slippage", async () => {
    const { vault, alice } = await loadFixture(deploy);
    await openTx(vault, alice, E(0.15));
    await expect(vault.connect(alice).open(0, 0, { value: E(0.06) })).to.be.revertedWithCustomError(vault, "WalletLimit");
    await expect(vault.connect(alice).open(0, 0, { value: E(0.0005) })).to.be.revertedWithCustomError(vault, "TooSmall");
    await expect(vault.connect(alice).open(0, L(999), { value: E(0.01) })).to.be.revertedWithCustomError(vault, "Slippage");
  });

  it("refuses positions the reserves cannot back", async () => {
    const { vault, owner, bob } = await loadFixture(deploy);
    await vault.connect(owner).withdrawReserves(E(1.95), owner.address);
    // 0.05 ETH reserves back at most 0.025 ETH principal at 3x
    await expect(vault.connect(bob).open(0, 0, { value: E(0.1) })).to.be.revertedWithCustomError(vault, "InsufficientReserves");
    await openTx(vault, bob, E(0.02));
  });

  it("only lets the owner withdraw unlocked reserves", async () => {
    const { vault, owner, alice } = await loadFixture(deploy);
    await openTx(vault, alice, E(0.1003));
    const free = await vault.effectiveReserves();
    await expect(vault.withdrawReserves(free + 1n, owner.address)).to.be.revertedWithCustomError(vault, "InsufficientReserves");
    await expect(vault.connect(alice).withdrawReserves(1, alice.address)).to.be.revertedWithCustomError(vault, "OwnableUnauthorizedAccount");
    await vault.withdrawReserves(free, owner.address);
    expect(await vault.effectiveReserves()).to.equal(0);
  });

  it("blocks trading on stale prices and allows an emergency refund later", async () => {
    const { vault, feeds, alice } = await loadFixture(deploy);
    const pos = await openTx(vault, alice, E(0.1003));
    await time.increase(3601);
    const [, valid] = await vault.indexLevel(0);
    expect(valid).to.equal(false);
    await expect(vault.connect(alice).open(0, 0, { value: E(0.01) })).to.be.revertedWithCustomError(vault, "StalePrice");
    await expect(vault.connect(alice).close(pos.positionId, 0)).to.be.revertedWithCustomError(vault, "StalePrice");
    await expect(vault.connect(alice).emergencyRefund(pos.positionId)).to.be.revertedWithCustomError(vault, "PriceStillValid");
    await time.increase(3 * 86400);
    await expect(vault.connect(alice).emergencyRefund(pos.positionId)).to.changeEtherBalance(alice, pos.principal, { includeFee: false });
    expect(await vault.lockedReserves()).to.equal(0);
    // a fresh price makes the index valid again
    await feeds[0].setPrice(P(100));
  });

  it("only lets the owner close their own open position once", async () => {
    const { vault, alice, bob } = await loadFixture(deploy);
    const pos = await openTx(vault, alice, E(0.05));
    await expect(vault.connect(bob).close(pos.positionId, 0)).to.be.revertedWithCustomError(vault, "NotPositionOwner");
    await vault.connect(alice).close(pos.positionId, 0);
    await expect(vault.connect(alice).close(pos.positionId, 0)).to.be.revertedWithCustomError(vault, "PositionClosedAlready");
  });

  it("validates index creation and params", async () => {
    const { vault, feeds, alice } = await loadFixture(deploy);
    const addrs = await Promise.all(feeds.map((f) => f.getAddress()));
    await expect(vault.createIndex("X", "X", "", addrs.slice(0, 2), [5000, 4000])).to.be.revertedWithCustomError(vault, "InvalidParams");
    await expect(vault.connect(alice).createIndex("X", "X", "", addrs.slice(0, 1), [10000])).to.be.revertedWithCustomError(vault, "OwnableUnauthorizedAccount");
    await expect(vault.setParams({ ...PARAMS, feeBps: 201 })).to.be.revertedWithCustomError(vault, "InvalidParams");
    await openTx(vault, alice, E(0.01));
    await expect(vault.setParams({ ...PARAMS, maxPayoutBps: 20_000 })).to.be.revertedWithCustomError(vault, "InvalidParams");
    await vault.setParams({ ...PARAMS, feeBps: 10 });
  });

  it("pauses new positions but still allows closing", async () => {
    const { vault, alice } = await loadFixture(deploy);
    const pos = await openTx(vault, alice, E(0.05));
    await vault.setIndexActive(0, false);
    await expect(vault.connect(alice).open(0, 0, { value: E(0.01) })).to.be.revertedWithCustomError(vault, "IndexInactive");
    await vault.connect(alice).close(pos.positionId, 0);
  });

  it("stays solvent across many random trades", async () => {
    const { vault, feeds, prices } = await loadFixture(deploy);
    const signers = (await ethers.getSigners()).slice(1, 9);
    const open = [];
    let seed = 7;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let step = 0; step < 60; step++) {
      await setAll(feeds, prices, 0.5 + rnd() * 2);
      if (open.length && rnd() < 0.5) {
        const { id, signer } = open.splice(Math.floor(rnd() * open.length), 1)[0];
        await vault.connect(signer).close(id, 0);
      } else {
        const signer = signers[Math.floor(rnd() * signers.length)];
        try {
          const pos = await openTx(vault, signer, E((0.001 + rnd() * 0.05).toFixed(6)));
          open.push({ id: pos.positionId, signer });
        } catch (e) {
          if (!/WalletLimit|InsufficientReserves/.test(e.message)) throw e;
        }
      }
      const bal = await ethers.provider.getBalance(await vault.getAddress());
      expect(bal).to.equal((await vault.reserves()) + (await vault.totalOpenInterest()));
      expect(await vault.reserves()).to.be.gte(await vault.lockedReserves());
    }
  });
});

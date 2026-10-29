import { useState } from "react";
import { parseEther } from "viem";
import { useAccount, useBalance } from "wagmi";
import IndexPicker from "../components/IndexPicker";
import PositionRow from "../components/PositionRow";
import { Headline, Pill } from "../components/StatCard";
import { chain, isConfigured } from "../config";
import { useSelectedIndex } from "../hooks/useSelectedIndex";
import { useTx } from "../hooks/useTx";
import { useIndexes, usePositions, useVaultState, vault } from "../hooks/useVault";
import { explorerLink, fmtEth, fmtLevel, fmtPct } from "../lib/format";

const SLIPPAGE = [0.5, 1, 2];

export default function Trade() {
  const { address, chainId } = useAccount();
  const indexes = useIndexes();
  const vaultState = useVaultState();
  const positions = usePositions(address);
  const balance = useBalance({ address, query: { enabled: Boolean(address), refetchInterval: 15_000 } });
  const { selected, select } = useSelectedIndex(indexes.data);
  const [amount, setAmount] = useState("");
  const [slippage, setSlippage] = useState(1);
  const tx = useTx(() => setAmount(""));

  const v = vaultState.data;
  let value = 0n;
  try {
    value = amount && Number(amount) > 0 ? parseEther(amount) : 0n;
  } catch {
    value = 0n;
  }
  const feeBps = BigInt(v?.feeBps ?? 0);
  const principal = (value * 10_000n) / (10_000n + feeBps);
  const fee = value - principal;
  const used = (positions.data ?? [])
    .filter((p) => p.open && p.indexId === selected?.id)
    .reduce((s, p) => s + p.principal, 0n);
  const remaining = v ? (v.walletPrincipalLimit > used ? v.walletPrincipalLimit - used : 0n) : 0n;
  const capacity = v?.maxOpenPrincipal ?? 0n;

  let problem = "";
  if (!isConfigured) problem = "Launching soon";
  else if (!address) problem = "Connect wallet to trade";
  else if (chainId !== chain.id) problem = `Switch to ${chain.name}`;
  else if (selected && !selected.valid) problem = "Prices are stale — trading paused";
  else if (selected && !selected.active) problem = "This index is paused";
  else if (value === 0n) problem = "Enter an amount";
  else if (v && principal < v.minPrincipal) problem = `Minimum is ${fmtEth(v.minPrincipal)} ETH`;
  else if (principal > remaining) problem = "Above your wallet principal limit";
  else if (principal > capacity) problem = "Not enough vault reserves";
  else if (balance.data && value > balance.data.value) problem = "Insufficient ETH balance";

  async function submit() {
    if (!selected || problem) return;
    const maxEntry = (selected.levelRaw * BigInt(Math.round((100 + slippage) * 100))) / 10_000n;
    await tx
      .writeContractAsync({ ...vault, functionName: "open", args: [BigInt(selected.id), maxEntry], value })
      .catch(() => {});
  }

  const fillMax = () => {
    const room = remaining < capacity ? remaining : capacity;
    const withFee = (room * (10_000n + feeBps)) / 10_000n;
    const bal = balance.data?.value ?? 0n;
    const max = withFee < bal ? withFee : bal;
    setAmount(max > 0n ? (Number(max) / 1e18).toFixed(6).replace(/\.?0+$/, "") : "");
  };

  const open = (positions.data ?? []).filter((p) => p.open);

  return (
    <div className="page">
      <div className="section-head">
        <h1 className="page-title">Trade</h1>
        {indexes.data && <IndexPicker indexes={indexes.data} selected={selected} onSelect={select} />}
      </div>

      <div className="trade-grid">
        <div className="card panel">
          {selected ? (
            <Headline
              label={`${selected.symbol} · Index level`}
              pill={selected.valid ? <Pill>Valid price</Pill> : <Pill tone="warn">Stale price</Pill>}
              value={selected.valid ? fmtLevel(selected.level) : "—"}
              change={selected.valid ? { text: fmtPct((selected.level / 1000 - 1) * 100), positive: selected.level >= 1000 } : undefined}
              changeLabel="Since launch"
            />
          ) : (
            <span className="muted">{indexes.isLoading ? "Loading…" : "No index available."}</span>
          )}
          <div className="divider" />

          <label className="field">
            <span className="field-label">
              Deposit (ETH)
              <span className="muted small">Balance: {balance.data ? fmtEth(balance.data.value) : "–"} ETH</span>
            </span>
            <div className="input-with-btn">
              <input inputMode="decimal" placeholder="0.0" value={amount} onChange={(e) => setAmount(e.target.value.replace(",", "."))} />
              <button type="button" className="chip" onClick={fillMax} disabled={!address || !v}>
                Max
              </button>
            </div>
          </label>
          <div className="chips">
            {["0.01", "0.05", "0.1", "0.2"].map((p) => (
              <button key={p} className="chip" onClick={() => setAmount(p)}>
                {p} ETH
              </button>
            ))}
          </div>

          <dl className="summary">
            <div><dt>Principal</dt><dd>{fmtEth(principal, 6)} ETH</dd></div>
            <div><dt>Open fee ({v ? v.feeBps / 100 : "–"}%)</dt><dd>{fmtEth(fee, 6)} ETH</dd></div>
            <div><dt>Entry level</dt><dd>{selected?.valid ? `≈ ${fmtLevel(selected.level)}` : "–"}</dd></div>
            <div><dt>Max payout</dt><dd>{v ? `${v.maxPayoutBps / 10_000}× principal` : "–"}</dd></div>
            <div><dt>Your remaining limit</dt><dd>{v ? `${fmtEth(remaining, 4)} ETH` : "–"}</dd></div>
          </dl>

          <div className="slippage small">
            <span className="muted">Max level slippage</span>
            {SLIPPAGE.map((s) => (
              <button key={s} className={s === slippage ? "chip active" : "chip"} onClick={() => setSlippage(s)}>
                {s}%
              </button>
            ))}
          </div>

          <button className="btn btn-primary btn-block" disabled={Boolean(problem) || tx.isBusy} onClick={submit}>
            {tx.isBusy ? "Confirming…" : problem || `Open ${selected?.symbol ?? ""} position`}
          </button>
          {tx.error && <p className="error small">{tx.error}</p>}
          {tx.isSuccess && (
            <p className="success small">
              Position opened.{" "}
              {tx.hash && explorerLink("tx", tx.hash) && (
                <a href={explorerLink("tx", tx.hash)} target="_blank" rel="noreferrer">View transaction</a>
              )}
            </p>
          )}
        </div>

        <div className="card how">
          <h3 className="card-title">How it works</h3>
          <ol className="muted">
            <li>Deposit ETH to open a position at the current index level.</li>
            <li>Your position's value moves with the index: if the index rises 10%, your ETH value rises 10%.</li>
            <li>Close any time prices are valid to receive ETH back, up to {v ? v.maxPayoutBps / 10_000 : 3}× your principal.</li>
          </ol>
        </div>
      </div>

      {address && (
        <section className="section">
          <h2>Your open positions</h2>
          {open.length === 0 ? (
            <div className="card empty">No open positions yet.</div>
          ) : (
            <div className="list">
              {open.map((p) => (
                <PositionRow key={p.id.toString()} position={p} index={indexes.data?.find((i) => i.id === p.indexId)} vaultState={v} />
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}

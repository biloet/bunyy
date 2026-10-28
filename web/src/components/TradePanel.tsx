import { useState } from "react";
import { formatEther, parseEther, parseUnits, type Address } from "viem";
import { useAccount, useBalance, useReadContract } from "wagmi";
import { erc20Abi } from "viem";
import { launchpad, type TokenInfo } from "../hooks/useLaunchpad";
import { useTx } from "../hooks/useTx";
import { chain } from "../config";
import { explorerLink, fmtEth, fmtTokens } from "../lib/format";

const SLIPPAGE_OPTIONS = [1, 3, 5, 10];

function parseAmount(v: string, parse: (s: string) => bigint) {
  try {
    return v && Number(v) > 0 ? parse(v) : 0n;
  } catch {
    return 0n;
  }
}

export default function TradePanel({ token }: { token: TokenInfo }) {
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [amount, setAmount] = useState("");
  const [slippage, setSlippage] = useState(5);
  const { address, chainId } = useAccount();
  const tx = useTx(() => setAmount(""));

  const ethBalance = useBalance({ address, query: { enabled: Boolean(address) } });
  const tokenBalance = useReadContract({
    address: token.address,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [address as Address],
    query: { enabled: Boolean(address), refetchInterval: 8_000 },
  });

  const value = parseAmount(amount, side === "buy" ? parseEther : (s) => parseUnits(s, 18));
  const buyQuote = useReadContract({
    ...launchpad,
    functionName: "quoteBuy",
    args: [token.address, value],
    query: { enabled: side === "buy" && value > 0n },
  });
  const sellQuote = useReadContract({
    ...launchpad,
    functionName: "quoteSell",
    args: [token.address, value],
    query: { enabled: side === "sell" && value > 0n },
  });

  const closed = token.complete;
  const wrongChain = Boolean(address) && chainId !== chain.id;
  const minOut = (out: bigint) => (out * BigInt(10_000 - slippage * 100)) / 10_000n;

  async function submit() {
    if (value === 0n) return;
    if (side === "buy") {
      const out = buyQuote.data?.[0] ?? 0n;
      await tx.writeContractAsync({
        ...launchpad,
        functionName: "buy",
        args: [token.address, minOut(out)],
        value,
      });
    } else {
      const out = sellQuote.data?.[0] ?? 0n;
      await tx.writeContractAsync({
        ...launchpad,
        functionName: "sell",
        args: [token.address, value, minOut(out)],
      });
    }
  }

  const presets =
    side === "buy"
      ? ["0.01", "0.05", "0.1", "0.5"].map((v) => ({ label: `${v} ETH`, value: v }))
      : [25, 50, 75, 100].map((pct) => ({
          label: `${pct}%`,
          value: tokenBalance.data ? formatEther((tokenBalance.data * BigInt(pct)) / 100n) : "",
        }));

  const sellout = side === "buy" && buyQuote.data && buyQuote.data[0] === token.realToken && value > buyQuote.data[1];

  return (
    <div className="card trade-panel">
      <div className="tabs">
        <button className={side === "buy" ? "tab active buy" : "tab"} onClick={() => { setSide("buy"); setAmount(""); }}>
          Buy
        </button>
        <button className={side === "sell" ? "tab active sell" : "tab"} onClick={() => { setSide("sell"); setAmount(""); }}>
          Sell
        </button>
      </div>

      {closed ? (
        <p className="muted">
          The bonding curve is complete. {token.migrated ? "Trading continues on the DEX." : "Liquidity is being migrated to the DEX."}
        </p>
      ) : (
        <>
          <label className="field">
            <span className="field-label">
              Amount ({side === "buy" ? "ETH" : token.symbol})
              <span className="muted small">
                Balance:{" "}
                {side === "buy"
                  ? `${ethBalance.data ? fmtEth(ethBalance.data.value) : "–"} ETH`
                  : `${tokenBalance.data !== undefined ? fmtTokens(tokenBalance.data) : "–"} ${token.symbol}`}
              </span>
            </span>
            <input
              inputMode="decimal"
              placeholder="0.0"
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(",", "."))}
            />
          </label>
          <div className="chips">
            {presets.map((p) => (
              <button key={p.label} className="chip" onClick={() => setAmount(p.value)} disabled={!p.value}>
                {p.label}
              </button>
            ))}
          </div>

          <div className="quote small">
            {side === "buy" && buyQuote.data && value > 0n && (
              <>
                <div>You receive ≈ <strong>{fmtTokens(buyQuote.data[0])} {token.symbol}</strong></div>
                <div className="muted">Fee: {fmtEth(buyQuote.data[2], 6)} ETH</div>
                {sellout && <div className="accent">Completes the curve — you pay {fmtEth(buyQuote.data[1])} ETH, the rest is refunded.</div>}
              </>
            )}
            {side === "sell" && sellQuote.data && value > 0n && (
              <>
                <div>You receive ≈ <strong>{fmtEth(sellQuote.data[0], 6)} ETH</strong></div>
                <div className="muted">Fee: {fmtEth(sellQuote.data[1], 6)} ETH</div>
              </>
            )}
          </div>

          <div className="slippage small">
            <span className="muted">Max slippage</span>
            {SLIPPAGE_OPTIONS.map((s) => (
              <button key={s} className={s === slippage ? "chip active" : "chip"} onClick={() => setSlippage(s)}>
                {s}%
              </button>
            ))}
          </div>

          <button
            className={`btn btn-block ${side === "buy" ? "btn-primary" : "btn-danger"}`}
            disabled={!address || wrongChain || value === 0n || tx.isBusy}
            onClick={() => submit().catch(() => {})}
          >
            {!address
              ? "Connect wallet to back this agent"
              : wrongChain
                ? `Switch to ${chain.name}`
                : tx.isBusy
                  ? "Confirming…"
                  : side === "buy"
                    ? `Buy ${token.symbol}`
                    : `Sell ${token.symbol}`}
          </button>
        </>
      )}

      {tx.error && <p className="error small">{tx.error}</p>}
      {tx.isSuccess && tx.hash && (
        <p className="success small">
          Trade confirmed.{" "}
          {explorerLink("tx", tx.hash) && (
            <a href={explorerLink("tx", tx.hash)} target="_blank" rel="noreferrer">View transaction</a>
          )}
        </p>
      )}
    </div>
  );
}

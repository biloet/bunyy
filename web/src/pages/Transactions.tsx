import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAccount } from "wagmi";
import { useTokens, useTrades } from "../hooks/useLaunchpad";
import { explorerLink, fmtEth, fmtTokens, shortAddr, timeAgo } from "../lib/format";

export default function Transactions() {
  const { address } = useAccount();
  const trades = useTrades();
  const { tokens } = useTokens();
  const [mine, setMine] = useState(false);

  const symbols = useMemo(() => new Map((tokens ?? []).map((t) => [t.address.toLowerCase(), t.symbol])), [tokens]);
  const rows = useMemo(() => {
    const list = [...(trades.data ?? [])].reverse();
    return mine && address ? list.filter((t) => t.trader.toLowerCase() === address.toLowerCase()) : list;
  }, [trades.data, mine, address]);

  return (
    <div className="page">
      <div className="section-head">
        <h1 className="page-title">Transactions</h1>
        <div className="segmented">
          <button className={!mine ? "seg active" : "seg"} onClick={() => setMine(false)}>
            All
          </button>
          <button className={mine ? "seg active" : "seg"} onClick={() => setMine(true)} disabled={!address}>
            Mine
          </button>
        </div>
      </div>

      {trades.error && <p className="error">Could not load transactions: {(trades.error as Error).message}</p>}
      {trades.isLoading && <p className="muted">Loading…</p>}
      {trades.data && rows.length === 0 && <div className="card empty">No transactions yet.</div>}
      {rows.length > 0 && (
        <div className="card table-wrap">
          <table className="trades">
            <thead>
              <tr>
                <th>Token</th>
                <th>Type</th>
                <th>ETH</th>
                <th>Amount</th>
                <th>Account</th>
                <th>When</th>
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 200).map((t) => {
                const tx = explorerLink("tx", t.txHash);
                return (
                  <tr key={t.txHash + t.token + t.tokenAmount}>
                    <td>
                      <Link to={`/token/${t.token}`}>{symbols.get(t.token.toLowerCase()) ?? shortAddr(t.token)}</Link>
                    </td>
                    <td className={t.isBuy ? "buy" : "sell"}>{t.isBuy ? "Buy" : "Sell"}</td>
                    <td className="mono">{fmtEth(t.ethAmount)}</td>
                    <td className="mono">{fmtTokens(t.tokenAmount)}</td>
                    <td>{shortAddr(t.trader)}</td>
                    <td>
                      {tx ? (
                        <a href={tx} target="_blank" rel="noreferrer">
                          {timeAgo(t.timestamp)}
                        </a>
                      ) : (
                        timeAgo(t.timestamp)
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

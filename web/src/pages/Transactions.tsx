import { useMemo, useState } from "react";
import { useAccount } from "wagmi";
import { useActivity, useIndexes } from "../hooks/useVault";
import { explorerLink, fmtEth, fmtLevel, shortAddr, timeAgo } from "../lib/format";

const KIND_LABEL = { open: "Open", close: "Close", refund: "Refund" } as const;

export default function Transactions() {
  const { address } = useAccount();
  const activity = useActivity();
  const indexes = useIndexes();
  const [mine, setMine] = useState(false);

  const rows = useMemo(() => {
    const list = activity.data ?? [];
    return mine && address ? list.filter((a) => a.owner.toLowerCase() === address.toLowerCase()) : list;
  }, [activity.data, mine, address]);
  const symbol = (id?: number) => (id === undefined ? "–" : indexes.data?.find((i) => i.id === id)?.symbol ?? `#${id}`);

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

      {activity.error && <p className="error">Could not load transactions: {(activity.error as Error).message}</p>}
      {activity.isLoading && <p className="muted">Loading…</p>}
      {activity.data && rows.length === 0 && <div className="card empty">No transactions yet.</div>}
      {rows.length > 0 && (
        <div className="card table-wrap">
          <table className="trades">
            <thead>
              <tr>
                <th>Type</th>
                <th>Index</th>
                <th>Amount</th>
                <th>Level</th>
                <th>Account</th>
                <th>When</th>
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 200).map((a) => {
                const tx = explorerLink("tx", a.txHash);
                return (
                  <tr key={`${a.txHash}-${a.kind}-${a.positionId}`}>
                    <td className={a.kind === "open" ? "buy" : a.kind === "close" ? "sell" : ""}>{KIND_LABEL[a.kind]}</td>
                    <td>{symbol(a.indexId)}</td>
                    <td>{fmtEth(a.amount, 5)} ETH</td>
                    <td>{a.level ? fmtLevel(Number(a.level) / 1e18) : "–"}</td>
                    <td>{shortAddr(a.owner)}</td>
                    <td>
                      {tx ? (
                        <a href={tx} target="_blank" rel="noreferrer">
                          {a.timestamp ? timeAgo(a.timestamp) : "tx"}
                        </a>
                      ) : a.timestamp ? (
                        timeAgo(a.timestamp)
                      ) : (
                        "–"
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

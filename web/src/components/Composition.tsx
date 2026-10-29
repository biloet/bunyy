import type { IndexView } from "../hooks/useVault";
import { fmtPct, fmtUsd, timeAgo } from "../lib/format";

export default function Composition({ index }: { index: IndexView }) {
  return (
    <div className="card">
      <div className="section-head">
        <h3 className="card-title">Composition</h3>
        <span className="muted small">{index.components.length} assets</span>
      </div>
      <div className="table-wrap">
        <table className="trades">
          <thead>
            <tr>
              <th>Asset</th>
              <th>Weight</th>
              <th>Price</th>
              <th>Since launch</th>
              <th>Updated</th>
            </tr>
          </thead>
          <tbody>
            {index.components.map((c) => {
              const change = (c.price / c.basePrice - 1) * 100;
              return (
                <tr key={c.feed}>
                  <td>
                    <strong>{c.label}</strong>
                  </td>
                  <td>
                    <div className="weight">
                      <span className="weight-bar" style={{ width: `${c.weightBps / 100}%` }} />
                      {(c.weightBps / 100).toFixed(0)}%
                    </div>
                  </td>
                  <td>{fmtUsd(c.price)}</td>
                  <td className={change >= 0 ? "buy" : "sell"}>{isFinite(change) ? fmtPct(change) : "–"}</td>
                  <td className="muted">{c.updatedAt ? timeAgo(c.updatedAt) : "–"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

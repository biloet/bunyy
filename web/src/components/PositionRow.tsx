import { useAccount } from "wagmi";
import type { ActivityItem, IndexView, PositionView, VaultState } from "../hooks/useVault";
import { vault } from "../hooks/useVault";
import { useTx } from "../hooks/useTx";
import { explorerLink, fmtEth, fmtLevel, fmtPct, timeAgo } from "../lib/format";

const CLOSE_SLIPPAGE_BPS = 100n; // accept up to 1% less than quoted

export default function PositionRow({
  position,
  index,
  vaultState,
  settlement,
}: {
  position: PositionView;
  index?: IndexView;
  vaultState?: VaultState;
  /** The close or refund event of a closed position. */
  settlement?: ActivityItem;
}) {
  const { address } = useAccount();
  const tx = useTx();
  const entry = Number(position.entryLevel) / 1e18;
  // Same basis as the "Position value" summary: what closing now pays, after fee.
  const pnlPct = position.quote > 0n ? (Number(position.quote) / Number(position.principal) - 1) * 100 : undefined;
  const now = Math.floor(Date.now() / 1000);
  const canRefund =
    position.open &&
    index !== undefined &&
    !index.valid &&
    vaultState !== undefined &&
    now >= index.oldestUpdate + vaultState.emergencyDelay;

  const close = () =>
    tx
      .writeContractAsync({
        ...vault,
        functionName: "close",
        args: [position.id, (position.quote * (10_000n - CLOSE_SLIPPAGE_BPS)) / 10_000n],
      })
      .catch(() => {});
  const refund = () => tx.writeContractAsync({ ...vault, functionName: "emergencyRefund", args: [position.id] }).catch(() => {});

  return (
    <div className="card position-row">
      <div className="position-main">
        <div className="position-title">
          <strong>{index?.symbol ?? `Index ${position.indexId}`}</strong>
          <span className={position.open ? "tag tag-good" : "tag"}>{position.open ? "Open" : "Closed"}</span>
          <span className="muted small">#{position.id.toString()} · {timeAgo(position.openedAt)}</span>
        </div>
        <div className="position-stats">
          <div>
            <span className="stat-label">Principal</span>
            <span className="mono">{fmtEth(position.principal, 5)} ETH</span>
          </div>
          <div>
            <span className="stat-label">Entry level</span>
            <span className="mono">{fmtLevel(entry)}</span>
          </div>
          {!position.open && settlement && (
            <>
              <div>
                <span className="stat-label">{settlement.kind === "refund" ? "Refunded" : "Received"}</span>
                <span className="mono">{fmtEth(settlement.amount, 5)} ETH</span>
              </div>
              <div>
                <span className="stat-label">Result</span>
                <span className={`mono ${settlement.amount >= position.principal ? "up" : "down"}`}>
                  {fmtPct((Number(settlement.amount) / Number(position.principal) - 1) * 100)}
                </span>
              </div>
            </>
          )}
          {position.open && (
            <>
              <div>
                <span className="stat-label">Value now</span>
                <span className="mono">{position.quote > 0n ? `${fmtEth(position.quote, 5)} ETH` : "–"}</span>
              </div>
              <div>
                <span className="stat-label">PnL</span>
                <span className={`mono ${pnlPct === undefined ? "" : pnlPct >= 0 ? "up" : "down"}`}>
                  {pnlPct === undefined ? "–" : fmtPct(pnlPct)}
                </span>
              </div>
            </>
          )}
        </div>
        {tx.error && <p className="error small">{tx.error}</p>}
        {tx.isSuccess && tx.hash && explorerLink("tx", tx.hash) && (
          <a className="small" href={explorerLink("tx", tx.hash)} target="_blank" rel="noreferrer">
            View transaction
          </a>
        )}
      </div>
      {position.open && address?.toLowerCase() === position.owner.toLowerCase() && (
        <div className="position-actions">
          {canRefund ? (
            <button className="btn btn-outline btn-warn" onClick={refund} disabled={tx.isBusy}>
              {tx.isBusy ? "Refunding…" : "Emergency refund"}
            </button>
          ) : (
            <button className="btn btn-outline" onClick={close} disabled={tx.isBusy || position.quote === 0n}>
              {tx.isBusy ? "Closing…" : "Close"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

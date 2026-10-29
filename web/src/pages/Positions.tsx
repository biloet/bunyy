import { Link } from "react-router-dom";
import { useAccount } from "wagmi";
import PositionRow from "../components/PositionRow";
import { Headline, StatRow } from "../components/StatCard";
import { useActivity, useIndexes, usePositions, useVaultState } from "../hooks/useVault";
import { fmtEth, fmtPct } from "../lib/format";

export default function Positions() {
  const { address } = useAccount();
  const indexes = useIndexes();
  const vaultState = useVaultState();
  const positions = usePositions(address);
  const activity = useActivity();

  if (!address) {
    return (
      <div className="page">
        <h1 className="page-title">My positions</h1>
        <div className="card empty">Connect your wallet to see your positions.</div>
      </div>
    );
  }

  const list = positions.data ?? [];
  const open = list.filter((p) => p.open);
  const closed = list.filter((p) => !p.open);
  const principal = open.reduce((s, p) => s + p.principal, 0n);
  const value = open.reduce((s, p) => s + p.quote, 0n);
  const pnl = principal > 0n ? (Number(value) / Number(principal) - 1) * 100 : 0;

  return (
    <div className="page">
      <h1 className="page-title">My positions</h1>
      <div className="card panel">
        <Headline
          label="Position value"
          value={
            <>
              {fmtEth(value, 5)}
              <span className="headline-unit">ETH</span>
            </>
          }
          change={principal > 0n ? { text: fmtPct(pnl), positive: pnl >= 0 } : undefined}
          changeLabel="Unrealized, after fee"
          caption="If closed now · ETH settlement"
        />
        <div className="divider" />
        <StatRow
          items={[
            { label: "Open positions", value: open.length },
            { label: "Principal", value: fmtEth(principal, 5), unit: "ETH" },
            { label: "Closed", value: closed.length },
          ]}
        />
      </div>

      {positions.isLoading && <p className="muted">Loading…</p>}
      {positions.data && list.length === 0 && (
        <div className="card empty">
          You have no positions yet. <Link to="/trade">Open one</Link>
        </div>
      )}
      {open.length > 0 && (
        <section className="section">
          <h2>Open</h2>
          <div className="list">
            {open.map((p) => (
              <PositionRow key={p.id.toString()} position={p} index={indexes.data?.find((i) => i.id === p.indexId)} vaultState={vaultState.data} />
            ))}
          </div>
        </section>
      )}
      {closed.length > 0 && (
        <section className="section">
          <h2>Closed</h2>
          <div className="list">
            {closed.map((p) => (
              <PositionRow
                key={p.id.toString()}
                position={p}
                index={indexes.data?.find((i) => i.id === p.indexId)}
                settlement={activity.data?.find((a) => a.kind !== "open" && a.positionId === p.id)}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

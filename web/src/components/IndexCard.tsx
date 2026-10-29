import { useMemo } from "react";
import { Link } from "react-router-dom";
import type { IndexView, VaultState } from "../hooks/useVault";
import { useLevelHistory } from "../hooks/useVault";
import { fmtEth, fmtLevel, fmtPct } from "../lib/format";
import PriceChart, { INDEX_RANGES, type Point } from "./PriceChart";
import { Headline, Pill, StatRow } from "./StatCard";

export default function IndexCard({
  index,
  vaultState,
  showCta = true,
}: {
  index: IndexView;
  vaultState?: VaultState;
  showCta?: boolean;
}) {
  const history = useLevelHistory(index.id);
  const change = (index.level / 1000 - 1) * 100;

  // Append the live level so the line always reaches "now".
  const points = useMemo<Point[]>(() => {
    const list = history.data ?? [];
    if (!index.valid || list.length === 0) return list;
    const now = Math.floor(Date.now() / 1000);
    return [...list, { t: Math.max(now, list[list.length - 1].t), v: index.level }];
  }, [history.data, index.valid, index.level]);

  return (
    <div className="card panel">
      <Headline
        label="Index level"
        pill={index.valid ? <Pill>Valid price</Pill> : <Pill tone="warn">Stale price</Pill>}
        value={index.valid ? fmtLevel(index.level) : "—"}
        change={index.valid ? { text: fmtPct(change), positive: change >= 0 } : undefined}
        changeLabel="Since launch"
        caption={`Live index · ETH settlement${index.active ? "" : " · paused"}`}
      />
      <div className="divider" />
      <StatRow
        items={[
          { label: "Effective reserves", value: vaultState ? fmtEth(vaultState.effectiveReserves, 5) : "–", unit: "ETH" },
          { label: "Wallet principal limit", value: vaultState ? fmtEth(vaultState.walletPrincipalLimit, 4) : "–", unit: "ETH" },
          { label: "Settlement", value: "ETH" },
        ]}
      />
      <PriceChart
        points={points}
        onRefresh={() => history.refetch()}
        ranges={INDEX_RANGES}
        defaultRange="1D"
        pillLabel="Last verified"
        emptyText={index.valid ? "Waiting for the first price checkpoint." : "Prices are stale — trading is paused until oracles update."}
      />
      {showCta && (
        <Link to={`/trade?index=${index.id}`} className="btn btn-primary btn-block">
          Trade {index.symbol}
        </Link>
      )}
    </div>
  );
}

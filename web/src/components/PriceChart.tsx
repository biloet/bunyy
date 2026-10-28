import type { TradeLog } from "../hooks/useLaunchpad";

/** Minimal SVG line chart of the curve price after each trade. */
export default function PriceChart({ trades, startPrice }: { trades: TradeLog[]; startPrice: number }) {
  const points = [startPrice, ...trades.map((t) => Number(t.virtualEth) / Number(t.virtualToken))];
  if (points.length < 2) {
    return <div className="chart chart-empty muted">No trades yet — be the first to buy.</div>;
  }
  const w = 600;
  const h = 220;
  const pad = 8;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min || max || 1;
  const xy = points.map((p, i) => {
    const x = pad + (i / (points.length - 1)) * (w - pad * 2);
    const y = h - pad - ((p - min) / span) * (h - pad * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const up = points[points.length - 1] >= points[0];
  return (
    <svg className="chart" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" role="img" aria-label="Price chart">
      <polyline
        points={`${pad},${h - pad} ${xy.join(" ")} ${w - pad},${h - pad}`}
        className={up ? "chart-area up" : "chart-area down"}
      />
      <polyline points={xy.join(" ")} className={up ? "chart-line up" : "chart-line down"} />
    </svg>
  );
}

import { useMemo, useState } from "react";

export type Point = { t: number; v: number };

export type Range = { key: string; seconds: number };

export const TRADE_RANGES: Range[] = [
  { key: "1H", seconds: 3600 },
  { key: "1D", seconds: 86_400 },
  { key: "1W", seconds: 604_800 },
  { key: "All", seconds: Infinity },
];

export const INDEX_RANGES: Range[] = [
  { key: "1D", seconds: 86_400 },
  { key: "1W", seconds: 604_800 },
  { key: "1M", seconds: 2_592_000 },
  { key: "1Y", seconds: 31_536_000 },
];

const W = 600;
const H = 240;
const TICKS = 5;

function clock(t: number) {
  return new Date(t * 1000).toISOString().slice(11, 19);
}

function tickLabel(v: number, span: number) {
  if (v === 0) return "0";
  if (Math.abs(v) < 0.001) return v.toExponential(2);
  const digits = Math.min(8, Math.max(1, Math.ceil(-Math.log10(span || Math.abs(v))) + 2));
  return v.toFixed(digits);
}

/**
 * Line chart card body: range selector, y-axis labels, grid, area fill and a
 * marker on the latest point. `points` must be sorted by time.
 */
export default function PriceChart({
  points,
  onRefresh,
  emptyText = "No trades yet.",
  ranges = TRADE_RANGES,
  pillLabel = "Last trade",
  defaultRange,
}: {
  points: Point[];
  onRefresh?: () => void;
  emptyText?: string;
  ranges?: Range[];
  pillLabel?: string;
  defaultRange?: string;
}) {
  const [range, setRange] = useState(defaultRange ?? ranges[ranges.length - 1].key);

  const shown = useMemo(() => {
    const seconds = ranges.find((r) => r.key === range)?.seconds ?? Infinity;
    if (!isFinite(seconds) || points.length === 0) return points;
    const from = Math.floor(Date.now() / 1000) - seconds;
    const inside = points.filter((p) => p.t >= from);
    const before = points.filter((p) => p.t < from).pop();
    // Carry the last value before the window in, so the line starts at the window edge.
    return before ? [{ t: from, v: before.v }, ...inside] : inside;
  }, [points, range, ranges]);

  const last = points[points.length - 1];

  return (
    <div className="chart-block">
      <div className="chart-toolbar">
        <button className="link-btn" onClick={onRefresh} type="button">
          Refresh chart
        </button>
        <div className="segmented" role="tablist">
          {ranges.map((r) => (
            <button
              key={r.key}
              type="button"
              role="tab"
              aria-selected={range === r.key}
              className={range === r.key ? "seg active" : "seg"}
              onClick={() => setRange(r.key)}
            >
              {r.key}
            </button>
          ))}
        </div>
      </div>
      {shown.length < 2 ? (
        <div className="chart-empty muted">{emptyText}</div>
      ) : (
        <Plot points={shown} lastTime={last?.t} pillLabel={pillLabel} />
      )}
    </div>
  );
}

function Plot({ points, lastTime, pillLabel }: { points: Point[]; lastTime?: number; pillLabel: string }) {
  const vals = points.map((p) => p.v);
  let min = Math.min(...vals);
  let max = Math.max(...vals);
  if (max === min) {
    const pad = max === 0 ? 1 : Math.abs(max) * 0.05;
    min = min >= 0 ? Math.max(0, min - pad) : min - pad;
    max += pad;
  } else {
    const pad = (max - min) * 0.08;
    // Prices and volumes are never negative, so don't pad the axis below zero.
    min = min >= 0 ? Math.max(0, min - pad) : min - pad;
    max += pad;
  }
  const span = max - min;
  const t0 = points[0].t;
  const t1 = points[points.length - 1].t;
  const tSpan = t1 - t0 || 1;

  const xy = points.map((p, i) => {
    const x = t1 === t0 ? (i / (points.length - 1)) * W : ((p.t - t0) / tSpan) * W;
    const y = H - ((p.v - min) / span) * H;
    return [x, y] as const;
  });
  const line = xy.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const ticks = Array.from({ length: TICKS }, (_, i) => max - (span * i) / (TICKS - 1));
  const [ex, ey] = xy[xy.length - 1];

  return (
    <div className="plot">
      <div className="plot-y">
        {ticks.map((v, i) => (
          <span key={i}>{tickLabel(v, span)}</span>
        ))}
      </div>
      <div className="plot-area">
        {lastTime !== undefined && <div className="plot-pill">{pillLabel} · {clock(lastTime).slice(0, 5)} UTC</div>}
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-label="Price chart">
          <defs>
            <linearGradient id="chart-fill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.28" />
              <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
            </linearGradient>
          </defs>
          {ticks.map((_, i) => {
            const y = (H * i) / (TICKS - 1);
            return <line key={i} x1="0" x2={W} y1={y} y2={y} className="grid-line" />;
          })}
          <polygon points={`0,${H} ${line} ${W},${H}`} fill="url(#chart-fill)" />
          <polyline points={line} className="plot-line" />
        </svg>
        <span className="plot-dot" style={{ left: `${(ex / W) * 100}%`, top: `${(ey / H) * 100}%` }} />
      </div>
      <div className="plot-x">
        <span>{clock(points[0].t)}</span>
        <span>{clock(points[points.length - 1].t)} UTC</span>
      </div>
    </div>
  );
}

import type { ReactNode } from "react";

/** Big-number card header: label + status pill, headline value with change, caption. */
export function Headline({
  label,
  pill,
  value,
  change,
  changeLabel,
  caption,
}: {
  label: string;
  pill?: ReactNode;
  value: ReactNode;
  change?: { text: string; positive: boolean };
  changeLabel?: string;
  caption?: ReactNode;
}) {
  return (
    <div className="headline">
      <div className="headline-top">
        <span className="headline-label">{label}</span>
        {pill}
      </div>
      <div className="headline-row">
        <span className="headline-value">{value}</span>
        {change && (
          <span className="headline-change">
            <span className={change.positive ? "up" : "down"}>{change.text}</span>
            {changeLabel && <span className="muted">{changeLabel}</span>}
          </span>
        )}
      </div>
      {caption && <div className="headline-caption muted">{caption}</div>}
    </div>
  );
}

export function Pill({ children, tone = "good" }: { children: ReactNode; tone?: "good" | "warn" | "neutral" }) {
  return (
    <span className={`pill pill-${tone}`}>
      <span className="pill-dot" />
      {children}
    </span>
  );
}

export function StatRow({ items }: { items: { label: string; value: ReactNode; unit?: string }[] }) {
  return (
    <div className="stat-row">
      {items.map((it) => (
        <div key={it.label} className="stat-item">
          <span className="stat-label">{it.label}</span>
          <span className="stat-value">
            {it.value}
            {it.unit && <span className="stat-unit"> {it.unit}</span>}
          </span>
        </div>
      ))}
    </div>
  );
}

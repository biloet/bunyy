export default function ProgressBar({ value, label }: { value: number; label?: string }) {
  const pct = Math.min(100, Math.max(0, value * 100));
  return (
    <div className="progress" title={`${pct.toFixed(1)}%`}>
      <div className="progress-fill" style={{ width: `${pct}%` }} />
      {label && <span className="progress-label">{label}</span>}
    </div>
  );
}

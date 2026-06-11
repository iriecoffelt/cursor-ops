import { chartColor } from "./chartColors";

export function BarChart({ data, emptyLabel = "No data" }: { data: Record<string, number>; emptyLabel?: string }) {
  const entries = Object.entries(data);
  if (!entries.length) return <p className="empty">{emptyLabel}</p>;

  const max = Math.max(...entries.map(([, v]) => v), 1);

  return (
    <div className="bar-chart">
      {entries.map(([label, value], index) => (
        <div className="bar-row" key={label}>
          <div className="bar-label" title={label}>
            <span className="legend-swatch" style={{ background: chartColor(index) }} aria-hidden="true" />
            <span className="bar-label-text">{label}</span>
          </div>
          <div className="bar-track">
            <div
              className="bar-fill animate-bar"
              style={{
                width: `${(value / max) * 100}%`,
                background: chartColor(index),
                animationDelay: `${index * 0.08}s`,
              }}
            />
          </div>
          <div className="bar-count">{value}</div>
        </div>
      ))}
    </div>
  );
}

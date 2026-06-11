import type { ReactNode } from "react";

type StatVariant = "default" | "warn" | "danger";

export function StatCard({
  label,
  value,
  hint,
  variant = "default",
  delay = 0,
}: {
  label: string;
  value: number | string;
  hint?: ReactNode;
  variant?: StatVariant;
  delay?: number;
}) {
  return (
    <div
      className={`stat-card animate-in${variant !== "default" ? ` stat-card-${variant}` : ""}`}
      style={{ animationDelay: `${delay * 0.06}s` }}
    >
      <div className="stat-shimmer" aria-hidden="true" />
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
      {hint ? <div className="stat-hint">{hint}</div> : null}
    </div>
  );
}

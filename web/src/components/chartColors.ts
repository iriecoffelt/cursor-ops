export const CHART_COLORS = [
  "#6366f1",
  "#22d3ee",
  "#a855f7",
  "#f472b6",
  "#34d399",
  "#fbbf24",
  "#fb7185",
  "#38bdf8",
];

export function chartColor(index: number) {
  return CHART_COLORS[index % CHART_COLORS.length];
}

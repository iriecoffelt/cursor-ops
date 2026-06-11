export const CHART_COLORS = [
  "#00f5ff",
  "#ff00aa",
  "#b026ff",
  "#ffd000",
  "#39ff14",
  "#ff3366",
  "#ff6600",
  "#4de8ff",
];

export function chartColor(index: number) {
  return CHART_COLORS[index % CHART_COLORS.length];
}

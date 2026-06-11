import { chartColor } from "./chartColors";

function colorForStatus(_status: string, index: number) {
  return chartColor(index);
}

export function StackedBoardChart({
  data,
  emptyLabel = "No data",
}: {
  data: Record<string, Record<string, number>>;
  emptyLabel?: string;
}) {
  const boards = Object.entries(data);
  if (!boards.length) return <p className="empty">{emptyLabel}</p>;

  const allStatuses = [...new Set(boards.flatMap(([, statuses]) => Object.keys(statuses)))];
  const maxTotal = Math.max(
    ...boards.map(([, statuses]) => Object.values(statuses).reduce((a, b) => a + b, 0)),
    1,
  );

  return (
    <div className="stacked-board-chart">
      <div className="status-legend">
        {allStatuses.map((status, i) => (
          <span className="legend-item" key={status}>
            <span className="legend-swatch" style={{ background: colorForStatus(status, i) }} />
            {status}
          </span>
        ))}
      </div>

      {boards.map(([board, statuses]) => {
        const total = Object.values(statuses).reduce((a, b) => a + b, 0);
        const entries = Object.entries(statuses);

        return (
          <div className="stacked-board-row" key={board}>
            <div className="bar-row">
              <div className="bar-label" title={board}>{board}</div>
              <div className="bar-track stacked">
                {entries.map(([status, count]) => (
                  <div
                    key={status}
                    className="bar-segment"
                    title={`${status}: ${count}`}
                    style={{
                      width: `${(count / maxTotal) * 100}%`,
                      background: colorForStatus(status, allStatuses.indexOf(status)),
                    }}
                  />
                ))}
              </div>
              <div className="bar-count">{total}</div>
            </div>
            <div className="board-status-breakdown">
              {entries.map(([status, count]) => (
                <span className="status-chip" key={status}>
                  <span
                    className="legend-swatch"
                    style={{ background: colorForStatus(status, allStatuses.indexOf(status)) }}
                  />
                  {status}: {count}
                </span>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

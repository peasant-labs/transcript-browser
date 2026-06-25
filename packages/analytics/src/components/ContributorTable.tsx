import type { ContributorBreakdown } from "../metrics/index.js";
import { cn } from "../internal/cn.js";
import { formatTokens, formatDuration, formatNumber } from "../internal/format.js";

export interface ContributorTableProps {
  rows: ContributorBreakdown[];
  /**
   * Optional renderer for the contributor cell — lets the host turn the opaque
   * `contributorId` into a display name / avatar / link WITHOUT the package
   * knowing anything about identities or routes. Defaults to the raw id.
   */
  renderContributor?: (row: ContributorBreakdown) => React.ReactNode;
  /** Cap the number of rows shown; omit for all. */
  limit?: number;
  className?: string;
}

/**
 * A sortable-by-volume contributor table (rows arrive pre-sorted from
 * `perContributorBreakdown`). The host controls how each contributor is
 * displayed via `renderContributor`; the package never assumes a name, avatar
 * or route. Paints from fairtrade tokens.
 */
export function ContributorTable({
  rows,
  renderContributor,
  limit,
  className,
}: ContributorTableProps) {
  const shown = typeof limit === "number" ? rows.slice(0, limit) : rows;

  if (shown.length === 0) {
    return (
      <div className={cn("tb-a-empty", className)}>No contributor data.</div>
    );
  }

  return (
    <div className={cn("tb-a-table-wrap", className)}>
      <table className="tb-a-table">
        <thead>
          <tr>
            <th className="tb-a-table__th">Contributor</th>
            <th className="tb-a-table__th tb-a-table__num">Sessions</th>
            <th className="tb-a-table__th tb-a-table__num">Active wks</th>
            <th className="tb-a-table__th tb-a-table__num">Tokens</th>
            <th className="tb-a-table__th tb-a-table__num">Duration</th>
            <th className="tb-a-table__th tb-a-table__num">Commits</th>
            <th className="tb-a-table__th tb-a-table__num">Resolved</th>
          </tr>
        </thead>
        <tbody>
          {shown.map((row) => {
            const resolveRate =
              row.outcomes.total === 0
                ? null
                : row.outcomes.resolved / row.outcomes.total;
            return (
              <tr key={row.contributorId} className="tb-a-table__row">
                <td className="tb-a-table__td">
                  {renderContributor ? (
                    renderContributor(row)
                  ) : (
                    <span className="tb-a-mono">{row.contributorId}</span>
                  )}
                </td>
                <td className="tb-a-table__td tb-a-table__num tb-a-tnum">
                  {row.sessions}
                </td>
                <td className="tb-a-table__td tb-a-table__num tb-a-tnum">
                  {row.activeWeeks}
                </td>
                <td className="tb-a-table__td tb-a-table__num tb-a-tnum">
                  {formatTokens(row.totalTokens)}
                </td>
                <td className="tb-a-table__td tb-a-table__num tb-a-tnum">
                  {formatDuration(row.totalDurationMins)}
                </td>
                <td className="tb-a-table__td tb-a-table__num tb-a-tnum">
                  {row.sessionsWithCommit}
                </td>
                <td className="tb-a-table__td tb-a-table__num tb-a-tnum">
                  {resolveRate == null
                    ? "—"
                    : `${formatNumber(resolveRate * 100)}%`}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

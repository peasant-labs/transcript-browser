import { useMemo } from "react";
import { ChartBar, ChartLine, Sparkline, StatGrid } from "@peasant-labs/fairtrade/ui";
import type { SessionSummary } from "@peasant-labs/types";
import {
  computeProjectAnalytics,
  type ContributorBreakdown,
  type ProjectAnalytics,
} from "../metrics/index.js";
import { cn } from "../internal/cn.js";
import {
  formatDuration,
  formatNumber,
  formatRate,
  formatTokens,
  shortWeek,
} from "../internal/format.js";
import { ChartCard } from "./ChartCard.js";
import { ContributorTable } from "./ContributorTable.js";

/**
 * Which cards/sections to render. Every flag defaults to ON; set one to `false`
 * to hide that section, so the same component adapts to a single-project view,
 * a collective overview, a contributor-only table, etc. — no app branching
 * inside the package.
 */
export interface ProjectOverviewSections {
  /** The headline KPI tile row (totals, returning rate, streak, commit rate). */
  summary?: boolean;
  sessionsPerWeek?: boolean;
  weeklyActiveContributors?: boolean;
  newContributorVelocity?: boolean;
  avgDurationPerActiveWeek?: boolean;
  outcomeDistribution?: boolean;
  /** Median + p90 of the core numeric fields. */
  sessionStats?: boolean;
  contributorTable?: boolean;
}

const ALL_ON: Required<ProjectOverviewSections> = {
  summary: true,
  sessionsPerWeek: true,
  weeklyActiveContributors: true,
  newContributorVelocity: true,
  avgDurationPerActiveWeek: true,
  outcomeDistribution: true,
  sessionStats: true,
  contributorTable: true,
};

export interface ProjectOverviewProps {
  /**
   * Either raw session summaries (the component computes the metrics) OR a
   * pre-computed bundle (the host computed them, e.g. server-side). Provide
   * exactly one; `analytics` wins if both are given.
   */
  sessions?: SessionSummary[];
  analytics?: ProjectAnalytics;

  /** Optional heading shown above the grid. Omit for a chrome-less embed. */
  title?: string;
  /** Optional sub-heading under the title. */
  subtitle?: React.ReactNode;

  /** Show/hide individual sections. Unset keys default to ON. */
  sections?: ProjectOverviewSections;

  /** Cap rows in the contributor table. */
  contributorLimit?: number;
  /** Host-owned renderer for the contributor cell (name/avatar/link). */
  renderContributor?: (row: ContributorBreakdown) => React.ReactNode;

  /** Height (px) of each chart's plotting area. Default 200. */
  chartHeight?: number;

  className?: string;
}

const NO_SESSIONS: SessionSummary[] = [];

/**
 * ProjectOverview — a configurable analytics dashboard for a project or
 * collective. Accepts raw `SessionSummary[]` or a pre-computed
 * `ProjectAnalytics` bundle, renders fairtrade charts + a contributor table,
 * and paints entirely from fairtrade tokens. No routes, brand strings, fetching
 * or app coupling — sections are toggled via the `sections` prop and the
 * contributor cell is host-rendered.
 */
export function ProjectOverview({
  sessions,
  analytics: analyticsProp,
  title,
  subtitle,
  sections,
  contributorLimit,
  renderContributor,
  chartHeight = 200,
  className,
}: ProjectOverviewProps) {
  const show = { ...ALL_ON, ...sections };

  const data = useMemo<ProjectAnalytics>(
    () =>
      analyticsProp ?? computeProjectAnalytics(sessions ?? NO_SESSIONS),
    [analyticsProp, sessions],
  );

  const outcomeBars = useMemo(
    () =>
      [
        { name: "resolved", value: data.outcomeDistribution.resolved },
        { name: "partial", value: data.outcomeDistribution.partial },
        { name: "failed", value: data.outcomeDistribution.failed },
        { name: "unknown", value: data.outcomeDistribution.unknown },
      ].filter((d) => d.value > 0),
    [data.outcomeDistribution],
  );

  const rcr = data.returningContributorRate;
  const s2c = data.sessionToCommitRate;

  return (
    <div className={cn("tb-a-root", className)}>
      {title != null ? (
        <header className="tb-a-overview__head">
          <h2 className="tb-a-overview__title">{title}</h2>
          {subtitle != null ? (
            <p className="tb-a-overview__subtitle">{subtitle}</p>
          ) : null}
        </header>
      ) : null}

      {show.summary ? (
        <StatGrid
          tiles={[
            { key: "sessions", label: "Sessions", value: data.totalSessions },
            {
              key: "contributors",
              label: "Contributors",
              value: data.totalContributors,
            },
            {
              key: "returning-rate",
              label: "Returning rate",
              value: formatRate(rcr.rate),
              sub: `${rcr.returning} of ${rcr.total}`,
            },
            {
              key: "session-to-commit",
              label: "Session → commit",
              value: formatRate(s2c.rate),
              sub: `${s2c.withCommit} of ${s2c.total}`,
            },
            {
              key: "longest-streak",
              label: "Longest streak",
              value: `${data.longestStreak.weeks} wk`,
              sub: data.longestStreak.startWeek ?? undefined,
            },
            { key: "projects", label: "Projects", value: data.totalProjects },
          ]}
        />
      ) : null}

      <div className="tb-a-grid">
        {show.sessionsPerWeek ? (
          <ChartCard title="Sessions per week">
            <ChartBar
              data={data.sessionsPerWeek}
              xKey="week"
              series={[{ key: "count", name: "sessions", color: "amber" }]}
              height={chartHeight}
              xFormatter={shortWeek}
              valueFormatter={formatNumber}
            />
          </ChartCard>
        ) : null}

        {show.weeklyActiveContributors ? (
          <ChartCard title="Weekly active contributors">
            <ChartLine
              data={data.weeklyActiveContributors}
              xKey="week"
              series={[{ key: "contributors", name: "active", color: "teal", area: true }]}
              height={chartHeight}
              xFormatter={shortWeek}
              valueFormatter={formatNumber}
            />
          </ChartCard>
        ) : null}

        {show.newContributorVelocity ? (
          <ChartCard title="New contributors per week">
            <ChartBar
              data={data.newContributorVelocity}
              xKey="week"
              series={[{ key: "newContributors", name: "new", color: "olive" }]}
              height={chartHeight}
              xFormatter={shortWeek}
              valueFormatter={formatNumber}
            />
          </ChartCard>
        ) : null}

        {show.avgDurationPerActiveWeek ? (
          <ChartCard title="Avg duration per active week" subtitle="minutes">
            <ChartLine
              data={data.avgDurationPerActiveWeek}
              xKey="week"
              series={[{ key: "avgDurationMins", name: "avg mins", color: "mauve" }]}
              height={chartHeight}
              xFormatter={shortWeek}
              valueFormatter={formatNumber}
            />
          </ChartCard>
        ) : null}

        {show.outcomeDistribution ? (
          <ChartCard
            title="Outcome distribution"
            aside={<span className="tb-a-card__figure">{data.outcomeDistribution.total}</span>}
          >
            {outcomeBars.length === 0 ? (
              <div className="tb-a-empty">No outcome data.</div>
            ) : (
              <ChartBar
                data={outcomeBars}
                xKey="name"
                series={[{ key: "value", name: "sessions", color: "clay" }]}
                height={chartHeight}
                valueFormatter={formatNumber}
              />
            )}
          </ChartCard>
        ) : null}

        {show.sessionStats ? (
          <ChartCard title="Typical vs. tail" subtitle="median · p90">
            <Sparkline
              data={[
                data.sessionStats.durationMins.median ?? 0,
                data.sessionStats.totalTokens.median ?? 0,
                data.sessionStats.turnCount.median ?? 0,
                data.sessionStats.toolCallCount.median ?? 0,
              ]}
              type="bar"
              color="teal"
              width={140}
              height={28}
              label="median session stats sparkline"
            />
            <div className="tb-a-statgrid">
              <StatRow label="Duration" stat={data.sessionStats.durationMins} fmt={formatDuration} />
              <StatRow label="Tokens" stat={data.sessionStats.totalTokens} fmt={formatTokens} />
              <StatRow label="Turns" stat={data.sessionStats.turnCount} fmt={formatNumber} />
              <StatRow label="Tool calls" stat={data.sessionStats.toolCallCount} fmt={formatNumber} />
            </div>
          </ChartCard>
        ) : null}
      </div>

      {show.contributorTable ? (
        <ChartCard title="Contributors">
          <ContributorTable
            rows={data.perContributorBreakdown}
            limit={contributorLimit}
            renderContributor={renderContributor}
          />
        </ChartCard>
      ) : null}
    </div>
  );
}

function StatRow({
  label,
  stat,
  fmt,
}: {
  label: string;
  stat: { median: number | null; p90: number | null };
  fmt: (n: number | null | undefined) => string;
}) {
  return (
    <div className="tb-a-statrow">
      <span className="tb-a-statrow__label">{label}</span>
      <span className="tb-a-statrow__pair tb-a-tnum">
        <span>{fmt(stat.median)}</span>
        <span className="tb-a-statrow__sep">·</span>
        <span className="tb-a-statrow__p90">{fmt(stat.p90)}</span>
      </span>
    </div>
  );
}

import { useMemo, useRef } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { SessionSummary } from "@peasant-labs/types";
import {
  computeProjectAnalytics,
  type ContributorBreakdown,
  type ProjectAnalytics,
} from "../metrics/index.js";
import { cn } from "../internal/cn.js";
import { useChartTheme } from "../internal/useChartTheme.js";
import {
  formatDuration,
  formatNumber,
  formatRate,
  formatTokens,
  shortWeek,
} from "../internal/format.js";
import { StatCard } from "./StatCard.js";
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
 * `ProjectAnalytics` bundle, renders recharts charts + a contributor table, and
 * paints entirely from `--tb-*` tokens. No routes, brand strings, fetching or
 * app coupling — sections are toggled via the `sections` prop and the
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
  const rootRef = useRef<HTMLDivElement>(null);
  const theme = useChartTheme(rootRef.current);
  const show = { ...ALL_ON, ...sections };

  const data = useMemo<ProjectAnalytics>(
    () =>
      analyticsProp ?? computeProjectAnalytics(sessions ?? NO_SESSIONS),
    [analyticsProp, sessions],
  );

  const axisTick = { fill: theme.ink3, fontSize: 11, fontFamily: theme.fontSans };
  const tooltipStyle = {
    background: theme.surface,
    border: `1px solid ${theme.rule}`,
    color: theme.ink,
    fontSize: 12,
    fontFamily: theme.fontSans,
    borderRadius: 0,
  };

  const outcomePie = useMemo(
    () =>
      [
        { name: "Resolved", value: data.outcomeDistribution.resolved, fill: theme.positive },
        { name: "Partial", value: data.outcomeDistribution.partial, fill: theme.caution },
        { name: "Failed", value: data.outcomeDistribution.failed, fill: theme.negative },
        { name: "Unknown", value: data.outcomeDistribution.unknown, fill: theme.ink3 },
      ].filter((d) => d.value > 0),
    [data.outcomeDistribution, theme],
  );

  const rcr = data.returningContributorRate;
  const s2c = data.sessionToCommitRate;

  return (
    <div ref={rootRef} className={cn("tb-a-root", className)}>
      {title != null ? (
        <header className="tb-a-overview__head">
          <h2 className="tb-a-overview__title">{title}</h2>
          {subtitle != null ? (
            <p className="tb-a-overview__subtitle">{subtitle}</p>
          ) : null}
        </header>
      ) : null}

      {show.summary ? (
        <div className="tb-a-stats">
          <StatCard label="Sessions" value={data.totalSessions} />
          <StatCard label="Contributors" value={data.totalContributors} />
          <StatCard
            label="Returning rate"
            value={formatRate(rcr.rate)}
            hint={`${rcr.returning} of ${rcr.total}`}
          />
          <StatCard
            label="Session → commit"
            value={formatRate(s2c.rate)}
            hint={`${s2c.withCommit} of ${s2c.total}`}
          />
          <StatCard
            label="Longest streak"
            value={`${data.longestStreak.weeks} wk`}
            hint={data.longestStreak.startWeek ?? undefined}
          />
          <StatCard label="Projects" value={data.totalProjects} />
        </div>
      ) : null}

      <div className="tb-a-grid">
        {show.sessionsPerWeek ? (
          <ChartCard title="Sessions per week">
            <ResponsiveContainer width="100%" height={chartHeight}>
              <BarChart data={data.sessionsPerWeek} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
                <CartesianGrid stroke={theme.rule} vertical={false} />
                <XAxis dataKey="week" tickFormatter={shortWeek} tick={axisTick} stroke={theme.rule} />
                <YAxis allowDecimals={false} tick={axisTick} stroke={theme.rule} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: theme.rule, opacity: 0.3 }} />
                <Bar dataKey="count" name="Sessions" fill={theme.accent} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        ) : null}

        {show.weeklyActiveContributors ? (
          <ChartCard title="Weekly active contributors">
            <ResponsiveContainer width="100%" height={chartHeight}>
              <AreaChart data={data.weeklyActiveContributors} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
                <CartesianGrid stroke={theme.rule} vertical={false} />
                <XAxis dataKey="week" tickFormatter={shortWeek} tick={axisTick} stroke={theme.rule} />
                <YAxis allowDecimals={false} tick={axisTick} stroke={theme.rule} />
                <Tooltip contentStyle={tooltipStyle} />
                <Area
                  type="monotone"
                  dataKey="contributors"
                  name="Active"
                  stroke={theme.roleUser}
                  fill={theme.roleUser}
                  fillOpacity={0.18}
                />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>
        ) : null}

        {show.newContributorVelocity ? (
          <ChartCard title="New contributors per week">
            <ResponsiveContainer width="100%" height={chartHeight}>
              <BarChart data={data.newContributorVelocity} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
                <CartesianGrid stroke={theme.rule} vertical={false} />
                <XAxis dataKey="week" tickFormatter={shortWeek} tick={axisTick} stroke={theme.rule} />
                <YAxis allowDecimals={false} tick={axisTick} stroke={theme.rule} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: theme.rule, opacity: 0.3 }} />
                <Bar dataKey="newContributors" name="New" fill={theme.roleAssistant} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        ) : null}

        {show.avgDurationPerActiveWeek ? (
          <ChartCard title="Avg duration per active week" subtitle="minutes">
            <ResponsiveContainer width="100%" height={chartHeight}>
              <LineChart data={data.avgDurationPerActiveWeek} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
                <CartesianGrid stroke={theme.rule} vertical={false} />
                <XAxis dataKey="week" tickFormatter={shortWeek} tick={axisTick} stroke={theme.rule} />
                <YAxis tick={axisTick} stroke={theme.rule} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(v: number) => formatNumber(v)}
                />
                <Line
                  type="monotone"
                  dataKey="avgDurationMins"
                  name="Avg mins"
                  stroke={theme.accent}
                  dot={false}
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
        ) : null}

        {show.outcomeDistribution ? (
          <ChartCard
            title="Outcome distribution"
            aside={<span className="tb-a-card__figure">{data.outcomeDistribution.total}</span>}
          >
            {outcomePie.length === 0 ? (
              <div className="tb-a-empty">No outcome data.</div>
            ) : (
              <ResponsiveContainer width="100%" height={chartHeight}>
                <PieChart>
                  <Pie
                    data={outcomePie}
                    dataKey="value"
                    nameKey="name"
                    innerRadius="50%"
                    outerRadius="80%"
                    paddingAngle={2}
                    stroke={theme.surface}
                  >
                    {outcomePie.map((d) => (
                      <Cell key={d.name} fill={d.fill} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        ) : null}

        {show.sessionStats ? (
          <ChartCard title="Typical vs. tail" subtitle="median · p90">
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

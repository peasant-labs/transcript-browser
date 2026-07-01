import {
  useMemo,
  useState,
  type ComponentType,
  type ReactNode,
} from "react";
import {
  Activity,
  BarChart3,
  CircleCheck,
  GitCommitHorizontal,
  Hash,
  PieChart,
  SlidersHorizontal,
  Timer,
  TrendingUp,
  UserPlus,
  Users,
} from "@peasant-labs/fairtrade/icons";
import { ChartBar, ChartLine } from "@peasant-labs/fairtrade/ui";
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

type IconComponent = ComponentType<{
  className?: string;
  size?: number;
  "aria-hidden"?: boolean | "true" | "false";
}>;

export const PROJECT_OVERVIEW_SECTION = {
  Summary: "summary",
  SessionsPerWeek: "sessionsPerWeek",
  WeeklyActiveContributors: "weeklyActiveContributors",
  NewContributorVelocity: "newContributorVelocity",
  AvgDurationPerActiveWeek: "avgDurationPerActiveWeek",
  OutcomeDistribution: "outcomeDistribution",
  SessionStats: "sessionStats",
  ContributorTable: "contributorTable",
} as const;

export type ProjectOverviewSectionKey =
  (typeof PROJECT_OVERVIEW_SECTION)[keyof typeof PROJECT_OVERVIEW_SECTION];

/**
 * Which cards/sections to render. Every flag defaults to ON; set one to `false`
 * to hide that section, so the same component adapts to a single-project view,
 * a collective overview, a contributor-only table, etc. The visible-section
 * control can hide sections at runtime, but it cannot re-enable a host-hidden
 * section.
 */
export type ProjectOverviewSections = Partial<
  Record<ProjectOverviewSectionKey, boolean>
>;

export const PROJECT_OVERVIEW_SECTION_DEFS = [
  { key: PROJECT_OVERVIEW_SECTION.Summary, label: "summary" },
  { key: PROJECT_OVERVIEW_SECTION.SessionsPerWeek, label: "sessions/week" },
  { key: PROJECT_OVERVIEW_SECTION.WeeklyActiveContributors, label: "active" },
  { key: PROJECT_OVERVIEW_SECTION.NewContributorVelocity, label: "new" },
  { key: PROJECT_OVERVIEW_SECTION.AvgDurationPerActiveWeek, label: "duration" },
  { key: PROJECT_OVERVIEW_SECTION.OutcomeDistribution, label: "outcomes" },
  { key: PROJECT_OVERVIEW_SECTION.SessionStats, label: "typical" },
  { key: PROJECT_OVERVIEW_SECTION.ContributorTable, label: "table" },
] as const;

const ALL_ON: Required<ProjectOverviewSections> = {
  [PROJECT_OVERVIEW_SECTION.Summary]: true,
  [PROJECT_OVERVIEW_SECTION.SessionsPerWeek]: true,
  [PROJECT_OVERVIEW_SECTION.WeeklyActiveContributors]: true,
  [PROJECT_OVERVIEW_SECTION.NewContributorVelocity]: true,
  [PROJECT_OVERVIEW_SECTION.AvgDurationPerActiveWeek]: true,
  [PROJECT_OVERVIEW_SECTION.OutcomeDistribution]: true,
  [PROJECT_OVERVIEW_SECTION.SessionStats]: true,
  [PROJECT_OVERVIEW_SECTION.ContributorTable]: true,
};

const OUTCOME_SEGMENTS = [
  {
    key: "resolved",
    label: "resolved",
    token: "var(--olive)",
  },
  {
    key: "partial",
    label: "partial",
    token: "var(--amber)",
  },
  {
    key: "failed",
    label: "failed",
    token: "var(--clay)",
  },
  {
    key: "unknown",
    label: "unknown",
    token: "var(--ink-3)",
  },
] as const;

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
  subtitle?: ReactNode;

  /** Show/hide individual sections. Unset keys default to ON. */
  sections?: ProjectOverviewSections;
  /** Show the built-in visible-section toggle. */
  showSectionToggle?: boolean;

  /** Cap rows in the contributor table. */
  contributorLimit?: number;
  /** Host-owned renderer for the contributor cell (name/avatar/link). */
  renderContributor?: (row: ContributorBreakdown) => ReactNode;

  /** Height (px) of each chart's plotting area. Default 200. */
  chartHeight?: number;

  className?: string;
}

const NO_SESSIONS: SessionSummary[] = [];

/** Which weekly-contributor metric the merged "weekly active contributors" card plots. */
export type WeeklyContributorView = "active" | "new";

/**
 * ProjectOverview — a configurable analytics dashboard for a project or
 * collective. Accepts raw `SessionSummary[]` or a pre-computed
 * `ProjectAnalytics` bundle, renders the fairtrade analytics dashboard, and
 * paints entirely from fairtrade tokens. No routes, brand strings, fetching or
 * app coupling: data comes through props, identity rendering is host-owned, and
 * every section can be hidden through the typed section keys above.
 */
export function ProjectOverview({
  sessions,
  analytics: analyticsProp,
  title,
  subtitle,
  sections,
  showSectionToggle = true,
  contributorLimit,
  renderContributor,
  chartHeight = 200,
  className,
}: ProjectOverviewProps) {
  const inputSessions = sessions ?? NO_SESSIONS;
  const [userSections, setUserSections] =
    useState<Required<ProjectOverviewSections>>(() => ALL_ON);
  // Which series the "weekly active contributors" card plots. The card folds
  // in the "new contributors per week" metric behind a two-state toggle
  // (matches the fairtrade demo) rather than a second always-on card, so the
  // same weekly-cadence data gets one home instead of two.
  const [weeklyView, setWeeklyView] = useState<WeeklyContributorView>("active");

  const baseSections = useMemo<Required<ProjectOverviewSections>>(
    () => ({ ...ALL_ON, ...sections }),
    [sections],
  );

  const show = useMemo<Required<ProjectOverviewSections>>(
    () => ({
      [PROJECT_OVERVIEW_SECTION.Summary]:
        baseSections.summary && userSections.summary,
      [PROJECT_OVERVIEW_SECTION.SessionsPerWeek]:
        baseSections.sessionsPerWeek && userSections.sessionsPerWeek,
      [PROJECT_OVERVIEW_SECTION.WeeklyActiveContributors]:
        baseSections.weeklyActiveContributors &&
        userSections.weeklyActiveContributors,
      [PROJECT_OVERVIEW_SECTION.NewContributorVelocity]:
        baseSections.newContributorVelocity &&
        userSections.newContributorVelocity,
      [PROJECT_OVERVIEW_SECTION.AvgDurationPerActiveWeek]:
        baseSections.avgDurationPerActiveWeek &&
        userSections.avgDurationPerActiveWeek,
      [PROJECT_OVERVIEW_SECTION.OutcomeDistribution]:
        baseSections.outcomeDistribution &&
        userSections.outcomeDistribution,
      [PROJECT_OVERVIEW_SECTION.SessionStats]:
        baseSections.sessionStats && userSections.sessionStats,
      [PROJECT_OVERVIEW_SECTION.ContributorTable]:
        baseSections.contributorTable && userSections.contributorTable,
    }),
    [baseSections, userSections],
  );

  const data = useMemo<ProjectAnalytics>(
    () => analyticsProp ?? computeProjectAnalytics(inputSessions),
    [analyticsProp, inputSessions],
  );

  const defaultSubtitle = useMemo(
    () => overviewSubtitle(inputSessions, data),
    [data, inputSessions],
  );

  const visibleSubtitle = subtitle ?? defaultSubtitle;
  const outcomeTotal = data.outcomeDistribution.total;
  const totalCommits = data.perContributorBreakdown.reduce(
    (sum, row) => sum + row.sessionsWithCommit,
    0,
  );
  // A host that hides the new-contributor section also removes the "new"
  // option from the toggle — a host-hidden section stays un-selectable, same
  // rule as the visible-section chips below.
  const effectiveWeeklyView: WeeklyContributorView = show.newContributorVelocity
    ? weeklyView
    : "active";

  const setSection = (key: ProjectOverviewSectionKey) => {
    setUserSections((current) => ({
      ...current,
      [key]: !current[key],
    }));
  };

  return (
    <div className={cn("tb-a-root", className)}>
      {title != null || visibleSubtitle != null || showSectionToggle ? (
        <header className="tb-a-overview__head">
          <div className="tb-a-overview__titles">
            {title != null ? (
              <h2 className="tb-a-overview__title">{title}</h2>
            ) : null}
            {visibleSubtitle != null ? (
              <p className="tb-a-overview__subtitle">{visibleSubtitle}</p>
            ) : null}
          </div>
          {/* Own row below the subtitle, left-aligned — NOT crammed onto the
              title line (matches the fairtrade demo). */}
          {showSectionToggle ? (
            <SectionToggle
              baseSections={baseSections}
              sections={show}
              userSections={userSections}
              onToggle={setSection}
            />
          ) : null}
        </header>
      ) : null}

      <div className="tb-a-scroll">
        {show.summary ? (
          <div className="tb-a-kpis" role="list" aria-label="headline metrics">
            <StatTile
              icon={Activity}
              label="sessions"
              value={formatNumber(data.totalSessions)}
              hint="recorded"
            />
            <StatTile
              icon={Users}
              label="contributors"
              value={formatNumber(data.totalContributors)}
              hint={contributorHint(data.perContributorBreakdown)}
            />
            <StatTile
              icon={TrendingUp}
              label="returning rate"
              value={formatRate(data.returningContributorRate.rate)}
              hint={`${formatNumber(
                data.returningContributorRate.returning,
              )} of ${formatNumber(data.returningContributorRate.total)}`}
            />
            <StatTile
              icon={GitCommitHorizontal}
              label="session → commit"
              value={formatRate(data.sessionToCommitRate.rate)}
              hint={`${formatNumber(
                data.sessionToCommitRate.withCommit,
              )} of ${formatNumber(data.sessionToCommitRate.total)}`}
            />
            <StatTile
              icon={CircleCheck}
              label="longest streak"
              value={`${formatNumber(data.longestStreak.weeks)} wk`}
              hint={
                data.longestStreak.startWeek == null
                  ? undefined
                  : `from ${data.longestStreak.startWeek}`
              }
            />
            <StatTile
              icon={Hash}
              label="projects"
              value={formatNumber(data.totalProjects)}
              hint={projectHint(inputSessions, data.totalProjects)}
            />
          </div>
        ) : null}

        <div className="tb-a-grid">
          {show.sessionsPerWeek ? (
            <ChartCard
              icon={BarChart3}
              title="sessions per week"
              subtitle="agent sessions bucketed by iso week"
              aside={`${formatNumber(data.totalSessions)} total`}
            >
              <ChartBar
                data={chartRows(weekPoints(data.sessionsPerWeek, "count"))}
                xKey="label"
                series={[{ key: "value", name: "sessions", color: "amber" }]}
                height={chartHeight}
                valueFormatter={formatNumber}
              />
            </ChartCard>
          ) : null}

          {show.weeklyActiveContributors ? (
            <ChartCard
              icon={effectiveWeeklyView === "new" ? UserPlus : Users}
              title={
                effectiveWeeklyView === "new"
                  ? "new contributors per week"
                  : "weekly active contributors"
              }
              subtitle={
                effectiveWeeklyView === "new"
                  ? `acquisition signal · first appearance · ${formatNumber(
                      sumValues(
                        weekPoints(data.newContributorVelocity, "newContributors"),
                      ),
                    )} new`
                  : `distinct contributors active each week · ${formatNumber(
                      sumValues(
                        weekPoints(data.weeklyActiveContributors, "contributors"),
                      ),
                    )} active`
              }
              aside={
                <WeeklyMetricToggle
                  view={effectiveWeeklyView}
                  canShowNew={show.newContributorVelocity}
                  onChange={setWeeklyView}
                />
              }
            >
              {effectiveWeeklyView === "new" ? (
                <ChartBar
                  data={chartRows(
                    weekPoints(data.newContributorVelocity, "newContributors"),
                  )}
                  xKey="label"
                  series={[
                    { key: "value", name: "new contributors", color: "olive" },
                  ]}
                  height={chartHeight}
                  valueFormatter={formatNumber}
                />
              ) : (
                <ChartLine
                  data={chartRows(
                    weekPoints(data.weeklyActiveContributors, "contributors"),
                  )}
                  xKey="label"
                  series={[
                    {
                      key: "value",
                      name: "active contributors",
                      color: "teal",
                      area: true,
                    },
                  ]}
                  height={chartHeight}
                  valueFormatter={formatNumber}
                />
              )}
            </ChartCard>
          ) : null}

          {show.avgDurationPerActiveWeek ? (
            <ChartCard
              icon={Timer}
              title="avg duration per active week"
              subtitle="minutes"
              aside={`${formatDuration(
                avgValue(
                  weekPoints(data.avgDurationPerActiveWeek, "avgDurationMins"),
                ),
              )} avg`}
            >
              <ChartLine
                data={chartRows(
                  weekPoints(data.avgDurationPerActiveWeek, "avgDurationMins"),
                )}
                xKey="label"
                series={[{ key: "value", name: "minutes", color: "amber" }]}
                height={chartHeight}
                valueFormatter={formatNumber}
              />
            </ChartCard>
          ) : null}

          {show.outcomeDistribution ? (
            <ChartCard
              icon={PieChart}
              title="outcome distribution"
              subtitle="share of session outcomes"
              aside={`${formatNumber(outcomeTotal)} total`}
            >
              <OutcomeDonut data={data.outcomeDistribution} />
            </ChartCard>
          ) : null}

          {show.sessionStats ? (
            <ChartCard
              icon={Activity}
              title="typical vs. tail"
              subtitle="median · p90"
              aside="per session"
            >
              <TypicalStats data={data.sessionStats} />
            </ChartCard>
          ) : null}
        </div>

        {show.contributorTable ? (
          <ChartCard
            icon={Users}
            title="contributors"
            subtitle="rolled up · sorted by session volume"
            aside={`${formatNumber(data.perContributorBreakdown.length)} people`}
            className="tb-a-tablecard"
          >
            <ContributorTable
              rows={data.perContributorBreakdown}
              limit={contributorLimit}
              renderContributor={renderContributor}
            />
            <div className="tb-a-table-foot tb-a-mono">
              <span># totals {formatNumber(data.totalSessions)} sessions</span>
              <span># {formatTokens(totalTokens(data.perContributorBreakdown))} tokens</span>
              <span>↔ {formatNumber(totalCommits)} commits</span>
            </div>
          </ChartCard>
        ) : null}
      </div>
    </div>
  );
}

function SectionToggle({
  baseSections,
  sections,
  userSections,
  onToggle,
}: {
  baseSections: Required<ProjectOverviewSections>;
  sections: Required<ProjectOverviewSections>;
  userSections: Required<ProjectOverviewSections>;
  onToggle: (key: ProjectOverviewSectionKey) => void;
}) {
  const visible = PROJECT_OVERVIEW_SECTION_DEFS.filter(
    (section) => sections[section.key],
  ).length;

  return (
    <div className="tb-a-toggle" role="group" aria-label="visible sections">
      <span className="tb-a-toggle__label">
        <SlidersHorizontal className="lucide" aria-hidden="true" /> sections
        <b className="tb-a-tnum">
          {visible}/{PROJECT_OVERVIEW_SECTION_DEFS.length}
        </b>
      </span>
      <div className="tb-a-toggle__chips">
        {PROJECT_OVERVIEW_SECTION_DEFS.map((section) => {
          const hostEnabled = baseSections[section.key];
          const pressed = hostEnabled && userSections[section.key];
          return (
            <button
              key={section.key}
              type="button"
              className={cn("tb-a-seg", pressed && "is-on")}
              aria-pressed={pressed}
              disabled={!hostEnabled}
              onClick={() => onToggle(section.key)}
            >
              {section.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Two-state segmented control switching the "weekly active contributors"
 * card between the active-contributor series and the new-contributor
 * series. Distinct markup/class from the visible-section chips
 * (`.tb-a-mseg`, not `.tb-a-seg`) — this toggle selects WHICH DATA a single
 * card plots; the section chips select WHICH CARDS render at all. A
 * host-hidden "new contributors" section (canShowNew=false) disables the
 * "new" option the same way a host-hidden section chip stays un-selectable.
 */
function WeeklyMetricToggle({
  view,
  canShowNew,
  onChange,
}: {
  view: WeeklyContributorView;
  canShowNew: boolean;
  onChange: (view: WeeklyContributorView) => void;
}) {
  return (
    <div className="tb-a-mtoggle" role="group" aria-label="weekly contributor metric">
      <button
        type="button"
        className={cn("tb-a-mseg", view === "active" && "is-on")}
        aria-pressed={view === "active"}
        onClick={() => onChange("active")}
      >
        active
      </button>
      <button
        type="button"
        className={cn("tb-a-mseg", view === "new" && "is-on")}
        aria-pressed={view === "new"}
        disabled={!canShowNew}
        onClick={() => onChange("new")}
      >
        new
      </button>
    </div>
  );
}

function StatTile({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: IconComponent;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="tb-a-tile" role="listitem">
      <span className="tb-a-tile__label">
        <Icon className="lucide" aria-hidden="true" /> {label}
      </span>
      <span className="tb-a-tile__value tb-a-tnum">{value}</span>
      {hint != null ? <span className="tb-a-tile__hint">{hint}</span> : null}
    </div>
  );
}

type PlotPoint = {
  key: string;
  label: string;
  value: number;
};

/** A chart data row for the fairtrade ChartBar/ChartLine primitives. */
type ChartRow = {
  label: string;
  value: number;
};

/** Adapt weekly `PlotPoint[]` metrics into the row shape ChartBar/ChartLine expect. */
function chartRows(points: PlotPoint[]): ChartRow[] {
  return points.map((point) => ({ label: point.label, value: point.value }));
}

function OutcomeDonut({ data }: { data: ProjectAnalytics["outcomeDistribution"] }) {
  const total = data.total;
  if (total === 0) {
    return <div className="tb-a-empty">No outcome data.</div>;
  }

  const radius = 58;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="tb-a-donut">
      <svg className="tb-a-donut__svg" viewBox="0 0 180 180" role="img" aria-label="outcome distribution">
        {OUTCOME_SEGMENTS.map((segment) => {
          const value = data[segment.key];
          const length = (value / total) * circumference;
          const dashOffset = -offset;
          offset += length;
          if (value === 0) return null;
          const ariaLabel = `${segment.label}: ${formatNumber(value)} sessions`;
          return (
            <circle
              key={segment.key}
              cx="90"
              cy="90"
              r={radius}
              fill="none"
              stroke={segment.token}
              strokeWidth="28"
              strokeDasharray={`${length} ${circumference - length}`}
              strokeDashoffset={dashOffset}
              transform="rotate(-90 90 90)"
              className="tb-a-slice"
              tabIndex={0}
              role="img"
              aria-label={ariaLabel}
            >
              <title>{ariaLabel}</title>
            </circle>
          );
        })}
        <text x="90" y="84" className="tb-a-donut__num" textAnchor="middle">
          {formatNumber(total)}
        </text>
        <text x="90" y="106" className="tb-a-donut__label" textAnchor="middle">
          sessions
        </text>
      </svg>
      <ul className="tb-a-legend">
        {OUTCOME_SEGMENTS.map((segment) => {
          const value = data[segment.key];
          const pct = total === 0 ? 0 : value / total;
          return (
            <li key={segment.key} className="tb-a-legend__row">
              <span
                className="tb-a-legend__swatch"
                style={{ background: segment.token }}
                aria-hidden="true"
              />
              <span className="tb-a-legend__name">{segment.label}</span>
              <span className="tb-a-legend__value tb-a-tnum">
                {formatNumber(value)}
              </span>
              <span className="tb-a-legend__pct tb-a-tnum">
                {formatRate(pct)}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function TypicalStats({ data }: { data: ProjectAnalytics["sessionStats"] }) {
  return (
    <div className="tb-a-statgrid">
      <StatRow
        label="duration"
        median={formatDuration(data.durationMins.median)}
        p90={formatDuration(data.durationMins.p90)}
      />
      <StatRow
        label="tokens"
        median={formatTokens(data.totalTokens.median)}
        p90={formatTokens(data.totalTokens.p90)}
      />
      <StatRow
        label="turns"
        median={formatNumber(data.turnCount.median)}
        p90={formatNumber(data.turnCount.p90)}
      />
      <StatRow
        label="tool calls"
        median={formatNumber(data.toolCallCount.median)}
        p90={formatNumber(data.toolCallCount.p90)}
      />
    </div>
  );
}

function StatRow({
  label,
  median,
  p90,
}: {
  label: string;
  median: string;
  p90: string;
}) {
  return (
    <div className="tb-a-statrow">
      <span className="tb-a-statrow__label">{label}</span>
      <span className="tb-a-statrow__pair tb-a-tnum">
        <span className="tb-a-statrow__median">{median}</span>
        <span className="tb-a-statrow__sep">·</span>
        <span className="tb-a-statrow__p90">{p90}</span>
      </span>
    </div>
  );
}

function overviewSubtitle(
  sessions: SessionSummary[],
  data: ProjectAnalytics,
): string {
  return [
    projectHint(sessions, data.totalProjects),
    `${formatNumber(data.totalContributors)} ${plural(
      data.totalContributors,
      "contributor",
      "contributors",
    )}`,
    `${formatNumber(data.totalSessions)} ${plural(
      data.totalSessions,
      "session",
      "sessions",
    )} across ${formatNumber(data.sessionsPerWeek.length)} ${plural(
      data.sessionsPerWeek.length,
      "week",
      "weeks",
    )}`,
  ].join(" · ");
}

function projectHint(sessions: SessionSummary[], totalProjects: number): string {
  const projects = [
    ...new Set(sessions.map((session) => session.projectKey).filter(Boolean)),
  ].sort();
  if (projects.length === 0) {
    return totalProjects === 0
      ? "no projects"
      : `${formatNumber(totalProjects)} ${plural(
          totalProjects,
          "project",
          "projects",
        )}`;
  }
  if (projects.length === 1) return projects[0]!;
  if (projects.length <= 3) return projects.join(", ");
  return `${formatNumber(projects.length)} projects`;
}

function contributorHint(rows: ContributorBreakdown[]): string {
  if (rows.length === 0) return "none";
  const names = rows.slice(0, 3).map((row) => row.contributorId);
  return rows.length > 3 ? `${names.join(", ")} +${rows.length - 3}` : names.join(", ");
}

function plural(count: number, one: string, many: string): string {
  return count === 1 ? one : many;
}

function weekPoints<T extends { week: string }>(
  rows: T[],
  valueKey: keyof T,
): PlotPoint[] {
  return rows.map((row) => ({
    key: row.week,
    label: shortWeek(row.week),
    value: numeric(row[valueKey]),
  }));
}

function numeric(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function sumValues(points: PlotPoint[]): number {
  return points.reduce((sum, point) => sum + point.value, 0);
}

function avgValue(points: PlotPoint[]): number | null {
  if (points.length === 0) return null;
  return sumValues(points) / points.length;
}

function totalTokens(rows: ContributorBreakdown[]): number {
  return rows.reduce((sum, row) => sum + row.totalTokens, 0);
}

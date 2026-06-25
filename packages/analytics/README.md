# @peasant-labs/analytics

A **framework-agnostic** analytics layer for AI agent session data. Two layers,
both free of app-specific assumptions — no hardcoded routes, brand strings,
fetching, or auth:

1. **Pure metric functions** over `SessionSummary[]` — `sessionsPerWeek`,
   `weeklyActiveContributors`, `returningContributorRate`, `longestStreak`,
   `newContributorVelocity`, `sessionToCommitRate`, `avgDurationPerActiveWeek`,
   `outcomeDistribution`, `medianAndP90` (per metric, via `sessionStats`),
   `perContributorBreakdown`, plus `computeProjectAnalytics` (runs them all).
   **No React, no I/O** — import them in a CLI, a report, or a server handler.
2. **`<ProjectOverview>`** — a configurable React dashboard (fairtrade charts +
   a contributor table) that takes either raw `SessionSummary[]` *or* a
   pre-computed `ProjectAnalytics` bundle as props.

This is a **separate package** from `@peasant-labs/transcript-browser` on
purpose: analytics-only consumers get fairtrade charts + `clsx` and **never**
pull in the viewer's heavy deps (`shiki`, `@xyflow/react`, `react-markdown`).

## Install

The published package is **self-contained**: the sibling `@peasant-labs/types`
is bundled into `dist/` (both JS and `.d.ts`), and fairtrade owns the charting
implementation. A consumer installs **only** this package plus the React peers.

```bash
npm install @peasant-labs/analytics react react-dom
```

Import the **single** bundled stylesheet once at your app root — it already
contains the fairtrade theme tokens and the `tb-a-`-prefixed component styles:

```ts
import "@peasant-labs/analytics/styles.css"; // fairtrade tokens + component CSS
```

## Usage

### Map your data to `SessionSummary`

`SessionSummary` (from `@peasant-labs/types`, re-exported here) is the minimal,
opaque per-session shape analytics needs. Map your own records onto it — every
field's *meaning* is yours; the package never parses or brands it:

```ts
import type { SessionSummary } from "@peasant-labs/analytics";

const sessions: SessionSummary[] = rows.map((r) => ({
  id: r.sessionId,
  startTime: r.createdAt,        // ISO-8601; bucketed by UTC week
  projectKey: r.repoSlug,        // any stable project identifier
  contributorId: r.authorId,     // any stable contributor identifier
  durationMins: r.durationMinutes,
  totalTokens: r.tokens,
  turnCount: r.turns,
  toolCallCount: r.toolCalls,
  outcome: r.outcome,            // "resolved" | "partial" | "failed" | undefined
  commitCount: r.commits,        // → hasCommit derived; or pass hasCommit directly
  // optional quality m-metrics (signalDensity, specQualityScore, …) if you have them
}));
```

### The component

```tsx
import { ProjectOverview } from "@peasant-labs/analytics";
import "@peasant-labs/analytics/styles.css";

<ProjectOverview
  sessions={sessions}
  title="Project pulse"
  // Show/hide individual sections — every flag defaults to ON:
  sections={{ newContributorVelocity: false, contributorTable: true }}
  contributorLimit={10}
  // Host turns the OPAQUE contributorId into a name/avatar/link — the package
  // never assumes an identity or route:
  renderContributor={(row) => <a href={`/u/${row.contributorId}`}>{names[row.contributorId]}</a>}
/>;
```

Pass a pre-computed bundle instead of raw sessions (e.g. computed server-side):

```tsx
import { computeProjectAnalytics, ProjectOverview } from "@peasant-labs/analytics";

const analytics = computeProjectAnalytics(sessions); // pure, no React
<ProjectOverview analytics={analytics} />;
```

### Metrics without React

```ts
import {
  sessionsPerWeek,
  returningContributorRate,
  perContributorBreakdown,
} from "@peasant-labs/analytics";

console.log(sessionsPerWeek(sessions));            // [{ week: "2026-01-05", count: 12 }, …]
console.log(returningContributorRate(sessions));    // { total, returning, rate }
console.table(perContributorBreakdown(sessions));   // one rolled-up row per contributor
```

## The agnosticism contract

Same three rules as `@peasant-labs/transcript-browser`:

1. **Data IN via props only.** `ProjectOverview` takes `sessions` or
   `analytics`; no component fetches, reads env, or imports app code.
2. **Identity/routes OUT via a render-prop.** `renderContributor` lets the host
   own how an opaque `contributorId` is displayed (name, avatar, link). The
   package ships none of that.
3. **Theming via CSS variables only.** Every surface — cards, table, and
   fairtrade charts — paints from fairtrade tokens. Override a token to
   re-theme.

## Exports

- **Component:** `ProjectOverview` (+ `ProjectOverviewSections`), `StatCard`,
  `ChartCard`, `ContributorTable`.
- **Metric functions (pure):** `computeProjectAnalytics`, `sessionsPerWeek`,
  `weeklyActiveContributors`, `returningContributorRate`, `longestStreak`,
  `newContributorVelocity`, `sessionToCommitRate`, `avgDurationPerActiveWeek`,
  `outcomeDistribution`, `sessionStats`, `perContributorBreakdown`,
  `sessionHasCommit`, plus stat/time helpers (`medianAndP90`, `median`,
  `percentile`, `weekKey`, `dayKey`, `daysBetween`, `parseTime`, `isoDate`).
- **Types:** `SessionSummary`, `SessionOutcome`, `ProjectAnalytics`, and every
  per-metric result shape (`WeekCount`, `ContributorBreakdown`, …) — all
  re-exported inline (no `@peasant-labs/types` install needed).

## Dependencies

`@peasant-labs/fairtrade` owns the charts; `clsx` (class joining) is a small
bundled dependency. `react` / `react-dom` are the only required peers. No UI kit,
no router, no data layer.

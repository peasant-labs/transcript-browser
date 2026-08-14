import type { Meta, StoryObj } from "@storybook/react-vite";
import React, { useMemo } from "react";
import {
  SessionDetail,
  SessionTab,
  TrajectoryGraph,
  TurnRow,
  OutcomeChip,
  ErrorPill,
  DiffView,
  CodeBlock,
  annotateTranscript,
  type Harness,
  type TurnDetail,
} from "@peasant-labs/transcript-browser";
import { BrandMark } from "@peasant-labs/fairtrade/ui";
import { ProjectOverview } from "@peasant-labs/fairtrade/analytics";
import { samplePhases, sampleScorecard, sampleSession } from "../examples/minimal/src/sample-session.js";
import { sampleSessions } from "../examples/minimal/src/sample-analytics.js";

const BREADCRUMB = [
  { label: "sessions", href: "#sessions" },
  { label: sampleSession.id.slice(0, 8) },
];

const meta = {
  title: "Transcript Browser/Domain Smoke",
} satisfies Meta;

export default meta;
type Story = StoryObj;

function TranscriptViewerFixture() {
  const annotations = useMemo(() => annotateTranscript(sampleSession.turns ?? []), []);
  return (
    <div data-sbsmoke="transcript-viewer">
      <SessionDetail
        detail={sampleSession}
        phases={samplePhases}
        annotations={annotations}
        scorecard={sampleScorecard}
        initialTrajectoryMode="graph"
        breadcrumb={BREADCRUMB}
        capabilities={{ canCopyLink: true, canDownload: true }}
        callbacks={{ onCopyLink: () => undefined }}
        sessionLinkBuilder={(detail) => `/sessions/${detail.id}`}
        renderGraph={(props) => <TrajectoryGraph {...props} provider={sampleSession.harness} />}
      />
    </div>
  );
}

export const TranscriptViewer: Story = {
  render: () => <TranscriptViewerFixture />,
};

export const AnalyticsOverview: Story = {
  render: () => (
    <div data-sbsmoke="analytics-overview">
      <ProjectOverview payload={{ sessions: sampleSessions }} />
    </div>
  ),
};

// Per-consume story: the assistant accent follows the canonical provider policy,
// driven from a data-harness hook + the --turn-accent CSS var. One assistant
// turn per harness lets the fidelity gate assert each computed accent
// (claude-code amber / gemini-cli teal / codex olive / opencode mauve /
// cursor clay) without color being the sole signal (mark + name carry it too).
const ACCENT_HARNESSES: Harness[] = [
  "claude-code",
  "gemini-cli",
  "codex",
  "opencode",
  "cursor",
];

const accentTurn: TurnDetail = {
  index: 0,
  role: "assistant",
  content: "an assistant response, accented by its provider.",
  timestamp: "2026-05-28T10:00:00Z",
  depth: 0,
};
const userTurn: TurnDetail = {
  index: 0,
  role: "user",
  content: "a user prompt — accented teal.",
  timestamp: "2026-05-28T10:00:00Z",
  depth: 0,
};
const subagentTurn: TurnDetail = {
  index: 0,
  role: "assistant",
  depth: 1,
  agentName: "explorer",
  content: "a subagent turn — accented mauve.",
  timestamp: "2026-05-28T10:00:00Z",
};

// All three role accents in one story so the gate asserts user=teal,
// assistant=canonical accent for every schema harness, subagent=mauve.
export const ProviderAccent: Story = {
  render: () => (
    <div data-sbsmoke="provider-accent" className="tb-root">
      <div data-accent-role="user" style={{ marginBottom: "0.5rem" }}>
        <TurnRow turn={userTurn} turnNumber={1} />
      </div>
      {ACCENT_HARNESSES.map((harness) => (
        <SessionDetailAccentRow key={harness} harness={harness} />
      ))}
      <div data-accent-role="subagent" style={{ marginBottom: "0.5rem" }}>
        <TurnRow turn={subagentTurn} turnNumber={1} provider="claude-code" />
      </div>
    </div>
  ),
};

function SessionDetailAccentRow({ harness }: { harness: Harness }) {
  return (
    <div data-accent-harness={harness} style={{ marginBottom: "0.5rem" }}>
      <TurnRow turn={accentTurn} turnNumber={1} provider={harness} />
    </div>
  );
}

// ── Per-screen "in-use" stories ───────────────────────────────────────────
// One story per screen, rendering the full viewer (header + both split rails +
// the screen) over the seeded sample so the fidelity gate can assert each
// screen's chrome in isolation, in both themes.
function ScreenFixture({ tab, marker }: { tab: SessionTab; marker: string }) {
  const annotations = useMemo(() => annotateTranscript(sampleSession.turns ?? []), []);
  return (
    <div data-sbsmoke={marker}>
      <SessionDetail
        detail={sampleSession}
        phases={samplePhases}
        annotations={annotations}
        scorecard={sampleScorecard}
        initialTab={tab}
        breadcrumb={BREADCRUMB}
        capabilities={{ canCopyLink: true, canDownload: true }}
        callbacks={{ onCopyLink: () => undefined }}
        sessionLinkBuilder={(detail) => `/sessions/${detail.id}`}
        renderGraph={(props) => <TrajectoryGraph {...props} provider={sampleSession.harness} />}
      />
    </div>
  );
}

export const ScreenHighlights: Story = {
  render: () => <ScreenFixture tab={SessionTab.Highlights} marker="screen-highlights" />,
};
export const ScreenFullTrace: Story = {
  render: () => <ScreenFixture tab={SessionTab.Trace} marker="screen-full-trace" />,
};
export const ScreenDiffs: Story = {
  render: () => <ScreenFixture tab={SessionTab.Diffs} marker="screen-diffs" />,
};
export const ScreenFiles: Story = {
  render: () => <ScreenFixture tab={SessionTab.Files} marker="screen-files" />,
};
export const ScreenAnnotations: Story = {
  render: () => <ScreenFixture tab={SessionTab.Annotations} marker="screen-annotations" />,
};

// ── Per-consume component stories ─────────────────────────────────────────
// Toned chips: the semantic outcome/error chips compose <Chip tone> — the gate
// asserts each computed tone colour (resolved→ok/teal, partial→warn/amber,
// failed/error→err/clay).
export const TonedChips: Story = {
  render: () => (
    <div data-sbsmoke="toned-chips" className="tb-root" style={{ display: "flex", gap: "0.5rem", padding: "1rem" }}>
      <span data-tone-chip="ok"><OutcomeChip outcome="resolved" /></span>
      <span data-tone-chip="warn"><OutcomeChip outcome="partial" /></span>
      <span data-tone-chip="err"><OutcomeChip outcome="failed" /></span>
      <span data-tone-chip="err-pill"><ErrorPill /></span>
    </div>
  ),
};

// DiffView sign gutter: composed fairtrade chassis with the redundant +/− gutter.
export const DiffSignGutter: Story = {
  render: () => (
    <div data-sbsmoke="diff-sign-gutter" className="tb-root" style={{ padding: "1rem" }}>
      <DiffView
        filePath="src/example.ts"
        oldText={"const a = 1;\nconst b = 2;\nconsole.log(a);\n"}
        newText={"const a = 1;\nconst b = 3;\nconst c = 4;\nconsole.log(a, c);\n"}
      />
    </div>
  ),
};

// BrandMark: real provider marks across the five harnesses.
export const BrandMarks: Story = {
  render: () => (
    <div data-sbsmoke="brand-marks" className="tb-root" style={{ display: "flex", gap: "0.75rem", padding: "1rem" }}>
      <BrandMark name="claude" label="Claude" />
      <BrandMark name="gemini" label="Gemini" />
      <BrandMark name="openai" label="OpenAI" />
      <BrandMark name="cursor" label="Cursor" />
      <BrandMark name="opencode" label="opencode" />
    </div>
  ),
};

export const CodeBlockThemes: Story = {
  render: () => (
    <div data-sbsmoke="codeblock-themes" className="tb-root" style={{ padding: "1rem" }}>
      <CodeBlock code="const transcript = true;" lang="ts" />
    </div>
  ),
};

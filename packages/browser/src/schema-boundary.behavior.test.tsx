// @vitest-environment jsdom
import { renderToStaticMarkup } from "react-dom/server";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import type { SessionDetailPayload } from "@peasant-labs/schema";
import type { TranscriptViewModel } from "@peasant-labs/fairtrade/ui";
import { SessionDetail } from "./SessionDetail.js";
import { loadSchemaBoundaryFixture } from "./schema-boundary-fixture.test-helper.js";

const capture = vi.hoisted(() => ({ calls: [] as Array<{ wire: SessionDetailPayload; view: TranscriptViewModel }> }));

vi.mock("@peasant-labs/fairtrade/icons", async () => {
  const React = await import("react");
  const Icon = (props: Record<string, unknown>) => React.createElement("span", props);
  return {
    AlertCircle: Icon, AlertTriangle: Icon, ArrowDownToLine: Icon, ArrowRight: Icon, ArrowUpToLine: Icon,
    BookOpen: Icon, Brain: Icon, Check: Icon, CheckSquare: Icon, ChevronDown: Icon,
    ChevronLeft: Icon, ChevronRight: Icon, ChevronUp: Icon, ChevronsUpDown: Icon,
    CircleDot: Icon, Clock: Icon, Coins: Icon, Copy: Icon, CornerDownRight: Icon, Download: Icon, FileDiff: Icon,
    FilePlus2: Icon, FileSearch: Icon, FileText: Icon, Flag: Icon, Folder: Icon,
    GitBranch: Icon, GitCommit: Icon, GitCommitHorizontal: Icon, Globe: Icon, LayoutList: Icon, Link: Icon,
    List: Icon, ListChecks: Icon, ListTree: Icon, Lock: Icon, Maximize2: Icon, MessageSquare: Icon,
    MessageSquareText: Icon, Minus: Icon, MoreHorizontal: Icon, Network: Icon,
    Pencil: Icon, Play: Icon, Plus: Icon, RefreshCw: Icon, RotateCcw: Icon,
    Search: Icon, Share2: Icon, ShieldCheck: Icon, SlidersHorizontal: Icon,
    Sparkles: Icon, Terminal: Icon, TrendingDown: Icon, TrendingUp: Icon, Trash2: Icon,
    User: Icon, Users: Icon, Wrench: Icon, X: Icon,
  };
});

vi.mock("@peasant-labs/fairtrade/ui", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@peasant-labs/fairtrade/ui")>();
  const React = await import("react");
  const Stub = ({ children }: { children?: ReactNode }) => React.createElement("span", null, children);
  return {
    ...actual,
    useTranscriptInitialPosition: () => ({ position: null, token: null }),
    adaptTranscript: (wire: SessionDetailPayload) => {
      const view = actual.adaptTranscript(wire);
      capture.calls.push({ wire, view });
      return view;
    },
    Breadcrumb: Stub,
    CheckpointMarker: Stub,
    Chip: Stub,
    CountBadge: Stub,
    DiffView: Stub,
    GraphLegend: Stub,
    GraphSubagentBranch: Stub,
    GraphToolNode: Stub,
    GraphTurnNode: Stub,
    Kbd: Stub,
    MetaItem: Stub,
    PhaseDivider: Stub,
    ProviderIcon: Stub,
    StepsWaterfall: Stub,
    Tooltip: Stub,
    TranscriptDiffEntryCard: Stub,
    TranscriptToolCall: Stub,
    TurnContextBar: Stub,
  };
});

const schemaFixture = loadSchemaBoundaryFixture();
const cases = schemaFixture.cases;

function renderCases(): Array<{ fixture: (typeof cases)[number]; wire: SessionDetailPayload; view: TranscriptViewModel }> {
  capture.calls.length = 0;
  for (const fixture of cases) {
    renderToStaticMarkup(<SessionDetail detail={fixture.session} turns={fixture.explicitTurns} />);
  }
  expect(capture.calls, "every mounted SessionDetail must cross the adapter exactly once").toHaveLength(cases.length);
  return cases.map((fixture, index) => ({ fixture, ...capture.calls[index]! }));
}

describe("mounted SessionDetail schema behavior", () => {
  it("nullable turns remain empty", () => {
    const row = renderCases().find(({ fixture }) => fixture.session.turns === null)!;
    expect(row.wire.turns, "nullable turns must normalize before adaptation").toEqual([]);
    expect(row.view.turns, "nullable turns must render no transcript rows").toEqual([]);
  });

  it("explicit turns override canonical turns", () => {
    for (const { fixture, wire, view } of renderCases().filter(({ fixture }) => fixture.explicitTurns)) {
      expect(wire.turns?.map(({ index }) => index), "explicit turn precedence must reach the adapter").toEqual(fixture.expectedIndices);
      expect(view.turns.map(({ index }) => index), "explicit turn precedence must reach the mounted view").toEqual(fixture.expectedIndices);
    }
  });

  it("flat git fields reach canonical adapter", () => {
    for (const { fixture, wire, view } of renderCases()) {
      expect(wire.gitBranch, "flat git branch must reach the adapter").toBe(fixture.session.gitBranch);
      expect(wire.gitRemote, "flat git remote must reach the adapter").toBe(fixture.session.gitRemote);
      expect(view.session.git?.branch, "flat git branch must reach the view model").toBe(fixture.session.gitBranch);
      expect(view.session.git?.remote, "flat git remote must reach the view model").toBe(fixture.session.gitRemote);
    }
  });

  it("canonical Harness reaches adapter", () => {
    for (const { fixture, wire, view } of renderCases()) {
      expect(wire.harness, "canonical Harness must reach the adapter").toBe(fixture.session.harness);
      expect(view.session.harness, "canonical Harness must reach the view model").toBe(fixture.session.harness);
    }
  });

  it("canonical depth reaches adapter", () => {
    for (const { fixture, wire, view } of renderCases().filter(({ fixture }) => schemaFixture.depthCaseNames.includes(fixture.name))) {
      expect(wire.turns?.map(({ depth }) => depth) ?? [], "canonical depth must reach the adapter").toEqual(fixture.expectedDepths);
      expect(view.turns.map(({ depth }) => depth), "canonical depth must reach the view model").toEqual(fixture.expectedDepths);
    }
  });

  it("canonical StopReason reaches adapter", () => {
    for (const { fixture, wire, view } of renderCases().filter(({ fixture }) => schemaFixture.stopReasonCaseNames.includes(fixture.name))) {
      expect(wire.turns?.map(({ stopReason }) => stopReason) ?? [], "canonical StopReason must reach the adapter").toEqual(fixture.expectedStopReasons);
      expect(view.turns.map(({ stopReason }) => stopReason), "canonical StopReason must reach the view model").toEqual(fixture.expectedStopReasons);
    }
  });
});

describe("schema behavior fixture validation", () => {
  for (const mutation of schemaFixture.loaderMutations) {
    it(`rejects malformed behavior fixture: ${mutation.name}`, () => {
      const mutated = schemaFixture.source.replace(mutation.find, mutation.replace);
      expect(() => loadSchemaBoundaryFixture(mutated)).toThrow(new RegExp(mutation.expectedError));
    });
  }
});

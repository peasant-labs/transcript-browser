// @vitest-environment jsdom
import { StrictMode, type ReactNode } from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import YAML from "yaml";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SessionDetail } from "./SessionDetail.js";
import { SessionTab } from "./session-detail-types.js";
import type { TranscriptInitialPosition } from "@peasant-labs/fairtrade/ui";
import type { SessionDetailPayload } from "@peasant-labs/schema";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

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
    providerDisplayName: actual.providerDisplayName,
    providerAccent: actual.providerAccent,
    useTranscriptInitialPosition: actual.useTranscriptInitialPosition,
    transcriptInitialPositionReadiness: actual.transcriptInitialPositionReadiness,
    adaptTranscript: (wire: { turns?: Array<{ index: number }> }) => ({
      session: {},
      turns: (wire.turns ?? []).map((turn) => ({ index: turn.index, toolCalls: [] })),
      diffs: [], files: [], tasks: [], highlights: [],
    }),
    annotateTranscript: () => [],
    computePersonalMedians: () => null,
    computeTasks: () => [],
    computeTurnLabels: () => new Map(),
    prefilterTurns: (turns: unknown[]) => turns,
    Breadcrumb: Stub, CheckpointMarker: Stub, Chip: Stub, CountBadge: Stub, DiffView: Stub,
    GraphLegend: Stub, GraphSubagentBranch: Stub, GraphToolNode: Stub, GraphTurnNode: Stub,
    Kbd: Stub, MetaItem: Stub, PhaseDivider: Stub, ProviderIcon: Stub, StepsWaterfall: Stub,
    Tooltip: Stub, TranscriptDiffEntryCard: Stub, TranscriptToolCall: Stub, TurnContextBar: Stub,
    TranscriptTurnCard: Stub,
  };
});

const manifestSource = readFileSync(resolve(process.cwd(), "src/testdata/initial-position.manifest.yaml"), "utf8");
const casesSource = readFileSync(resolve(process.cwd(), "src/testdata/initial-position.yaml"), "utf8");
const productionSource = readFileSync(resolve(process.cwd(), "src/SessionDetail.tsx"), "utf8");
const caseFields = ["name", "family", "initialSession", "initialKind", "initialTurn", "initialLegacyTurn", "initialHashTurn", "initialTab", "initialMode", "rerenderSession", "rerenderKind", "rerenderTurn", "rerenderLegacyTurn", "expectedScrollTops", "expectedHistory", "expectedCallbacks"] as const;
const visibilityFields = ["name", "fullTurnsBefore", "renderedTurnsBefore", "fullTurnsAfter", "renderedTurnsAfter", "targetTurn", "expectedScrollTops", "expectedHistory", "expectedCallbacks"] as const;
const mutationFields = ["name", "find", "replace", "expectedFailedTestNames", "expectedFailurePattern"] as const;
type PositionKind = "none" | "top" | "turn";
type FixtureCase = {
  name: string; family: string; initialSession: string; initialKind: PositionKind;
  initialTurn: number; initialLegacyTurn: number; initialHashTurn: number;
  initialTab: "trace" | "highlights"; initialMode: "list" | "graph";
  rerenderSession: string; rerenderKind: PositionKind; rerenderTurn: number;
  rerenderLegacyTurn: number; expectedScrollTops: number[]; expectedHistory: string[]; expectedCallbacks: string[];
};
type Mutation = { name: string; find: string; replace: string; expectedFailedTestNames: string[]; expectedFailurePattern: string };
type VisibilityFixture = {
  name: string; fullTurnsBefore: number[]; renderedTurnsBefore: number[]; fullTurnsAfter: number[];
  renderedTurnsAfter: number[]; targetTurn: number; expectedScrollTops: number[]; expectedHistory: string[];
  expectedCallbacks: string[];
};

function parseDocument(text: string, label: string): Record<string, unknown> {
  if (text.match(/^---\s*$/gm)?.length) throw new Error(`${label} must contain one YAML document`);
  const document = YAML.parseDocument(text, { strict: true, uniqueKeys: true });
  if (document.errors.length) throw new Error(`${label} is invalid: ${document.errors.map((error) => error.message).join("; ")}`);
  const value: unknown = document.toJS();
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${label} root must be an object`);
  return value as Record<string, unknown>;
}

function exactFields(value: Record<string, unknown>, fields: readonly string[], label: string): void {
  const unknown = Object.keys(value).filter((field) => !fields.includes(field));
  const missing = fields.filter((field) => !(field in value));
  if (unknown.length || missing.length) throw new Error(`${label} fields are invalid; unknown=${unknown.join(",")} missing=${missing.join(",")}`);
}

function loadFixtures(manifestText = manifestSource, casesText = casesSource): { cases: FixtureCase[]; visibilityCases: VisibilityFixture[]; mutations: Mutation[] } {
  const manifest = parseDocument(manifestText, "initial-position manifest");
  exactFields(manifest, ["expectedCaseCount", "requiredFamilies", "requiredNames", "expectedVisibilityCount", "requiredVisibilityNames", "expectedMutationCount", "mutations"], "initial-position manifest");
  if (!Number.isInteger(manifest.expectedCaseCount) || !Number.isInteger(manifest.expectedVisibilityCount) || !Number.isInteger(manifest.expectedMutationCount) || !Array.isArray(manifest.requiredFamilies) || !Array.isArray(manifest.requiredNames) || !Array.isArray(manifest.requiredVisibilityNames) || !Array.isArray(manifest.mutations)) throw new Error("initial-position manifest requires counts, families, names, visibility cases, and mutations");
  const families = manifest.requiredFamilies as unknown[];
  const names = manifest.requiredNames as unknown[];
  const visibilityNames = manifest.requiredVisibilityNames as unknown[];
  if ([...families, ...names, ...visibilityNames].some((value) => typeof value !== "string" || value.length === 0)) throw new Error("initial-position manifest entries must be nonempty strings");
  if (new Set(families).size !== families.length || new Set(names).size !== names.length || new Set(visibilityNames).size !== visibilityNames.length) throw new Error("initial-position manifest entries must be unique");
  if (families.length !== manifest.expectedCaseCount || names.length !== manifest.expectedCaseCount) throw new Error("initial-position manifest count must cover every family and name");
  if (visibilityNames.length !== manifest.expectedVisibilityCount) throw new Error("initial-position manifest count must cover every visibility name");
  const mutations = manifest.mutations.map((row, index) => {
    if (!row || typeof row !== "object" || Array.isArray(row)) throw new Error(`mutation ${index} must be an object`);
    const record = row as Record<string, unknown>;
    exactFields(record, mutationFields, `mutation ${index}`);
    for (const field of ["name", "find", "replace", "expectedFailurePattern"] as const) {
      if (typeof record[field] !== "string" || (record[field] as string).length === 0) throw new Error(`mutation ${index} has invalid typed values`);
    }
    const failedTestNames = record.expectedFailedTestNames;
    if (!Array.isArray(failedTestNames) || failedTestNames.length === 0 || failedTestNames.some((name) => typeof name !== "string" || name.length === 0) || new Set(failedTestNames).size !== failedTestNames.length) {
      throw new Error(`mutation ${index} expectedFailedTestNames must be a non-empty array of unique nonempty strings`);
    }
    return record as unknown as Mutation;
  });
  if (mutations.length !== manifest.expectedMutationCount || new Set(mutations.map((row) => row.name)).size !== mutations.length) throw new Error("mutation inventory count or names are invalid");
  const root = parseDocument(casesText, "initial-position cases");
  exactFields(root, ["cases", "visibilityCases"], "initial-position cases");
  if (!Array.isArray(root.cases) || !Array.isArray(root.visibilityCases)) throw new Error("initial-position case families must be arrays");
  const cases = root.cases.map((row, index) => {
    if (!row || typeof row !== "object" || Array.isArray(row)) throw new Error(`initial-position case ${index} must be an object`);
    const record = row as Record<string, unknown>;
    exactFields(record, caseFields, `initial-position case ${index}`);
    if (typeof record.name !== "string" || record.name.length === 0 || typeof record.family !== "string" || record.family.length === 0 || typeof record.initialSession !== "string" || record.initialSession.length === 0 || typeof record.rerenderSession !== "string" || record.rerenderSession.length === 0 || !["none", "top", "turn"].includes(record.initialKind as string) || !["none", "top", "turn"].includes(record.rerenderKind as string) || !["trace", "highlights"].includes(record.initialTab as string) || !["list", "graph"].includes(record.initialMode as string)) throw new Error(`initial-position case ${index} has invalid enum or string values`);
    for (const field of ["initialTurn", "initialLegacyTurn", "initialHashTurn", "rerenderTurn", "rerenderLegacyTurn"]) if (!Number.isSafeInteger(record[field])) throw new Error(`initial-position case ${index}.${field} must be an integer`);
    if (!Array.isArray(record.expectedScrollTops) || record.expectedScrollTops.some((value) => !Number.isFinite(value) || value < 0)) throw new Error(`initial-position case ${index}.expectedScrollTops must contain nonnegative numbers`);
    for (const field of ["expectedHistory", "expectedCallbacks"]) if (!Array.isArray(record[field]) || (record[field] as unknown[]).some((value) => typeof value !== "string" || value.length === 0)) throw new Error(`initial-position case ${index}.${field} must contain nonempty strings`);
    if ((record.initialKind === "turn") !== ((record.initialTurn as number) >= 0) || (record.rerenderKind === "turn") !== ((record.rerenderTurn as number) >= 0)) throw new Error(`initial-position case ${index} has invalid turn sentinel relations`);
    return record;
  });
  const caseNames = cases.map((row) => row.name);
  const caseFamilies = cases.map((row) => row.family);
  if (new Set(caseNames).size !== caseNames.length) throw new Error("initial-position case names must be unique");
  if (cases.length !== manifest.expectedCaseCount || names.some((name) => !caseNames.includes(name)) || caseNames.some((name) => !names.includes(name))) throw new Error("initial-position case names do not match the independent manifest");
  if (families.some((family) => !caseFamilies.includes(family))) throw new Error("initial-position cases are missing a required family");
  const visibilityCases = root.visibilityCases.map((row, index) => {
    if (!row || typeof row !== "object" || Array.isArray(row)) throw new Error(`visibility case ${index} must be an object`);
    const record = row as Record<string, unknown>;
    exactFields(record, visibilityFields, `visibility case ${index}`);
    if (typeof record.name !== "string" || record.name.length === 0 || !Number.isSafeInteger(record.targetTurn) || (record.targetTurn as number) < 0) throw new Error(`visibility case ${index} has invalid scalar values`);
    for (const field of ["fullTurnsBefore", "renderedTurnsBefore", "fullTurnsAfter", "renderedTurnsAfter", "expectedScrollTops"]) {
      if (!Array.isArray(record[field]) || (record[field] as unknown[]).some((entry) => !Number.isSafeInteger(entry) || (entry as number) < 0) || new Set(record[field] as unknown[]).size !== (record[field] as unknown[]).length) throw new Error(`visibility case ${index}.${field} must contain unique safe nonnegative integers`);
    }
    for (const field of ["expectedHistory", "expectedCallbacks"]) if (!Array.isArray(record[field]) || (record[field] as unknown[]).some((entry) => typeof entry !== "string")) throw new Error(`visibility case ${index}.${field} must contain strings`);
    if (!(record.renderedTurnsBefore as number[]).every((turn) => (record.fullTurnsBefore as number[]).includes(turn)) || !(record.renderedTurnsAfter as number[]).every((turn) => (record.fullTurnsAfter as number[]).includes(turn))) throw new Error(`visibility case ${index} rendered turns must be subsets of full turns`);
    return record as VisibilityFixture;
  });
  const actualVisibilityNames = visibilityCases.map((row) => row.name);
  if (visibilityCases.length !== manifest.expectedVisibilityCount || new Set(actualVisibilityNames).size !== visibilityCases.length || visibilityNames.some((name) => !actualVisibilityNames.includes(name as string)) || actualVisibilityNames.some((name) => !visibilityNames.includes(name))) throw new Error("visibility cases do not match their independent manifest");
  const allNames = [...caseNames, ...actualVisibilityNames, ...mutations.map((row) => row.name)];
  if (new Set(allNames).size !== allNames.length) throw new Error("initial-position case and mutation names must be globally unique");
  return { cases: cases as FixtureCase[], visibilityCases, mutations };
}

function verifyProduction(source: string): void {
  if ((source.match(/useTranscriptInitialPosition\(\{/g) ?? []).length !== 1 || /useLayoutEffect|appliedInitialPositionTokenRef|initialPositionToken\s*=/.test(source)) throw new Error("shared hook only");
  if ((source.match(/transcriptInitialPositionReadiness\(/g) ?? []).length !== 1) throw new Error("shared readiness only");
}

function assertExactMatrix(actual: unknown[], expected: unknown[], invariant: string): void {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(`${invariant} invariant failed: expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`);
}

const fixtures = loadFixtures();
verifyProduction(productionSource);

function position(kind: PositionKind, turnIndex: number): TranscriptInitialPosition | undefined {
  if (kind === "none") return undefined;
  return kind === "top" ? { kind: "top" } : { kind: "turn", turnIndex };
}

function detail(id: string, indices: number[] = [0, 42, 84]): SessionDetailPayload {
  return {
    id,
    harness: "codex",
    startTime: "2026-07-15T08:00:00Z",
    endTime: "2026-07-15T08:01:00Z",
    durationMins: 1,
    totalTokens: 12,
    tokensIn: 5,
    tokensOut: 7,
    turnCount: indices.length,
    toolCallCount: 0,
    turns: indices.map((index) => ({ index, role: "user" as const, content: `turn ${index}`, timestamp: "2026-07-15T08:00:00Z", depth: 0 })),
  };
}

afterEach(() => {
  document.body.innerHTML = "";
  window.history.replaceState({}, "", "/");
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("prior-version SessionDetail one-shot initial position", () => {
  for (const fixture of fixtures.cases) {
    it(fixture.name, async () => {
      const scrollTops: number[] = [];
      const history: string[] = [];
      const callbacks: string[] = [];
      vi.stubGlobal("IntersectionObserver", class {
        observe() {}
        unobserve() {}
        disconnect() {}
      });
      vi.spyOn(window, "scrollTo").mockImplementation(((options: ScrollToOptions) => {
        scrollTops.push(Number(options.top));
      }) as typeof window.scrollTo);
      vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function getRect(this: HTMLElement) {
        const turn = Number(this.dataset.turnIndex ?? 0);
        return { x: 0, y: turn * 10, top: turn * 10, right: 0, bottom: 0, left: 0, width: 0, height: 0, toJSON: () => ({}) };
      });
      Object.defineProperty(window, "innerHeight", { configurable: true, value: 1000 });
      window.history.replaceState({}, "", fixture.initialHashTurn < 0 ? "/" : `/#turn-${fixture.initialHashTurn}`);
      vi.spyOn(window.history, "replaceState").mockImplementation(() => { history.push("replace"); });
      vi.spyOn(window.history, "pushState").mockImplementation(() => { history.push("push"); });
      const container = document.createElement("div");
      document.body.append(container);
      const root = createRoot(container);

      await act(async () => {
        root.render(
          <StrictMode>
            <SessionDetail
              detail={detail(fixture.initialSession)}
              initialPosition={position(fixture.initialKind, fixture.initialTurn)}
              initialTurnIndex={fixture.initialLegacyTurn < 0 ? undefined : fixture.initialLegacyTurn}
              initialTab={fixture.initialTab === "trace" ? SessionTab.Trace : SessionTab.Highlights}
              initialTrajectoryMode={fixture.initialMode}
              renderGraph={() => <div data-testid="graph" />}
              callbacks={{
                onEdit: () => callbacks.push("edit"),
                onContribute: () => callbacks.push("contribute"),
                onCopyLink: () => callbacks.push("copy-link"),
                onDownload: () => callbacks.push("download"),
              }}
            />
          </StrictMode>,
        );
      });
      const mounted = container.querySelector(".v2-session-detail");
      await act(async () => {
        root.render(
          <StrictMode>
            <SessionDetail
              detail={detail(fixture.rerenderSession)}
              initialPosition={position(fixture.rerenderKind, fixture.rerenderTurn)}
              initialTurnIndex={fixture.rerenderLegacyTurn < 0 ? undefined : fixture.rerenderLegacyTurn}
              initialTab={fixture.initialTab === "trace" ? SessionTab.Trace : SessionTab.Highlights}
              initialTrajectoryMode={fixture.initialMode}
              renderGraph={() => <div data-testid="graph" />}
              callbacks={{
                onEdit: () => callbacks.push("edit"),
                onContribute: () => callbacks.push("contribute"),
                onCopyLink: () => callbacks.push("copy-link"),
                onDownload: () => callbacks.push("download"),
              }}
            />
          </StrictMode>,
        );
      });

      assertExactMatrix(scrollTops, fixture.expectedScrollTops, "positioning scroll");
      assertExactMatrix(history, fixture.expectedHistory, "positioning history");
      assertExactMatrix(callbacks, fixture.expectedCallbacks, "positioning callback");
      expect(container.querySelector(".v2-session-detail")).toBe(mounted);
      await act(async () => root.unmount());
    });
  }

  for (const fixture of fixtures.visibilityCases) {
    it(fixture.name, async () => {
      const scrollTops: number[] = [];
      const history: string[] = [];
      const callbacks: string[] = [];
      vi.stubGlobal("IntersectionObserver", class { observe() {} unobserve() {} disconnect() {} });
      vi.spyOn(window, "scrollTo").mockImplementation(((options: ScrollToOptions) => { scrollTops.push(Number(options.top)); }) as typeof window.scrollTo);
      vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function getRect(this: HTMLElement) {
        const turn = Number(this.dataset.turnIndex ?? 0);
        return { x: 0, y: turn * 10, top: turn * 10, right: 0, bottom: 0, left: 0, width: 0, height: 0, toJSON: () => ({}) };
      });
      Object.defineProperty(window, "innerHeight", { configurable: true, value: 1000 });
      vi.spyOn(window.history, "replaceState").mockImplementation(() => { history.push("replace"); });
      vi.spyOn(window.history, "pushState").mockImplementation(() => { history.push("push"); });
      const container = document.createElement("div");
      document.body.append(container);
      const root = createRoot(container);
      await act(async () => {
        root.render(<StrictMode><SessionDetail detail={detail("session-a", fixture.fullTurnsBefore)} turns={detail("session-a", fixture.renderedTurnsBefore).turns ?? []} initialPosition={{ kind: "turn", turnIndex: fixture.targetTurn }} /></StrictMode>);
      });
      const mounted = container.querySelector(".v2-session-detail");
      await act(async () => {
        root.render(<StrictMode><SessionDetail detail={detail("session-a", fixture.fullTurnsAfter)} turns={detail("session-a", fixture.renderedTurnsAfter).turns ?? []} initialPosition={{ kind: "turn", turnIndex: fixture.targetTurn }} /></StrictMode>);
      });
      assertExactMatrix(scrollTops, fixture.expectedScrollTops, "positioning scroll");
      assertExactMatrix(history, fixture.expectedHistory, "positioning history");
      assertExactMatrix(callbacks, fixture.expectedCallbacks, "positioning callback");
      expect(container.querySelector(".v2-session-detail")).toBe(mounted);
      await act(async () => root.unmount());
    });
  }
});

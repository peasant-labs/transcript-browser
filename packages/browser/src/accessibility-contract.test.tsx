// @vitest-environment jsdom
import { renderToStaticMarkup } from "react-dom/server";
import { createRoot } from "react-dom/client";
import { act } from "react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { SessionDetail } from "./SessionDetail.js";
import { FilterCheckbox } from "./rails/FilterCheckbox.js";
import { loadAccessibilityFixture } from "./accessibility-fixture.test-helper.js";

vi.mock("lucide-react", async () => {
  const React = await import("react");
  return new Proxy({}, {
    get: (_target, name) => name === "then" ? undefined : (props: Record<string, unknown>) =>
      React.createElement("span", { ...props, "data-icon": String(name) }),
  });
});

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
    useTranscriptInitialPosition: () => ({ position: null, token: null }),
    adaptTranscript: () => ({ session: {}, turns: [], diffs: [], files: [] }),
    annotateTranscript: () => [],
    computePersonalMedians: () => null,
    computeTasks: () => [],
    computeTurnLabels: () => new Map(),
    prefilterTurns: (turns: unknown[]) => turns,
    Breadcrumb: Stub, Chip: Stub, CountBadge: Stub, DiffView: Stub,
    GraphLegend: Stub, GraphSubagentBranch: Stub, GraphToolNode: Stub,
    GraphTurnNode: Stub, Kbd: Stub, MetaItem: Stub, ProviderIcon: Stub,
    StepsWaterfall: Stub, Tooltip: Stub, TranscriptDiffEntryCard: Stub,
    TranscriptToolCall: Stub, TurnContextBar: Stub,
  };
});

const fixture = loadAccessibilityFixture();
(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe("embedded transcript accessibility", () => {
  for (const fixtureCase of fixture.cases) {
    it(`${fixtureCase.name}: uses a named tab panel instead of adding another main landmark`, () => {
      const html = renderToStaticMarkup(<SessionDetail detail={fixtureCase.session} />);

      expect(html.match(/<main\b/g) ?? []).toHaveLength(fixtureCase.expected.mainLandmarks);
      expect(html).toContain('role="tabpanel"');
      expect(html).toContain(`aria-label="${fixtureCase.expected.tabPanelLabel}"`);
    });

    it(`${fixtureCase.name}: names the mounted checkbox and toggles through a user click`, async () => {
      const observed: boolean[] = [];
      const container = document.createElement("div");
      const root = createRoot(container);
      await act(async () => {
        root.render(<FilterCheckbox
          checked={fixtureCase.checkbox.initialChecked}
          onCheckedChange={(next) => observed.push(next)}
          label={fixtureCase.checkbox.label}
          count={fixtureCase.checkbox.count}
        />);
      });
      const checkbox = container.querySelector<HTMLElement>('[role="checkbox"]');
      expect(checkbox?.getAttribute("aria-label")).toBe(fixtureCase.checkbox.label);
      expect(checkbox?.getAttribute("aria-checked")).toBe(String(fixtureCase.checkbox.initialChecked));
      await act(async () => checkbox?.click());
      expect(observed).toEqual([fixtureCase.checkbox.expectedAfterClick]);
      await act(async () => root.unmount());
    });
  }

  for (const mutation of fixture.loaderMutations) {
    it(`rejects malformed fixture: ${mutation.name}`, () => {
      const mutated = fixture.source.replace(mutation.find, mutation.replace);
      expect(() => loadAccessibilityFixture(mutated)).toThrow(new RegExp(mutation.expectedError));
    });
  }
});

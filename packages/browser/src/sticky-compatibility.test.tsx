// @vitest-environment jsdom
import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { SessionDetailPayload } from "@peasant-labs/schema";
import type { ToolCallVM, TranscriptViewModel } from "@peasant-labs/fairtrade/ui";
import { SessionDetail } from "./SessionDetail.js";
import { loadStickyCompatibilityFixture } from "./sticky-compatibility-fixture.test-helper.js";

const capture = vi.hoisted(() => ({ calls: [] as Array<{ wire: SessionDetailPayload; view: TranscriptViewModel }> }));

vi.mock("@peasant-labs/fairtrade/icons", async () => {
  const React = await import("react");
  const Icon = (props: Record<string, unknown>) => React.createElement("span", props);
  const actual = await vi.importActual<typeof import("@peasant-labs/fairtrade/icons")>("@peasant-labs/fairtrade/icons");
  return new Proxy(actual, { get: (target, name) => name === "then" ? undefined : target[name as keyof typeof target] ?? Icon });
});

vi.mock("@peasant-labs/fairtrade/ui", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@peasant-labs/fairtrade/ui")>();
  return {
    ...actual,
    useTranscriptInitialPosition: () => ({ position: null, token: null }),
    adaptTranscript: (
      wire: SessionDetailPayload,
      annotations?: Parameters<typeof actual.adaptTranscript>[1],
      analytics?: Parameters<typeof actual.adaptTranscript>[2],
      options?: Parameters<typeof actual.adaptTranscript>[3],
    ) => {
      const view = actual.adaptTranscript(wire, annotations, analytics, options);
      capture.calls.push({ wire, view });
      return view;
    },
  };
});

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
const fixture = loadStickyCompatibilityFixture();
const SRC_ROOT = dirname(fileURLToPath(import.meta.url));
const mountedRoots: Array<{ root: ReturnType<typeof createRoot>; container: HTMLElement }> = [];

class TestIntersectionObserver implements IntersectionObserver {
  readonly root = null;
  readonly rootMargin = "0px";
  readonly thresholds = [0];
  disconnect(): void {}
  observe(): void {}
  takeRecords(): IntersectionObserverEntry[] { return []; }
  unobserve(): void {}
}

globalThis.IntersectionObserver = TestIntersectionObserver;

afterEach(async () => {
  for (const { root, container } of mountedRoots.splice(0)) {
    await act(async () => root.unmount());
    container.remove();
  }
  capture.calls.length = 0;
});

function* productionSourceFiles(dir: string): Generator<string> {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) yield* productionSourceFiles(full);
    else if (/\.tsx?$/.test(entry) && !/\.test\.tsx?$/.test(entry)) yield full;
  }
}

function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
}

function escaped(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function assertRows(html: string, testCase: (typeof fixture.cases)[number]): void {
  for (const row of testCase.expectedRows) {
    expect(html).toContain(`id="${row.id}"`);
    expect(html).toContain(`data-turn-row="${row.rowKey}"`);
    expect(html).toContain(row.content);
    if (row.effectiveModel === null) {
      expect(html).not.toMatch(new RegExp(`<span class="txn-turnmodel mono">[^<]*${escaped(row.content)}`));
    } else {
      expect(html).toContain(`>${row.effectiveModel}</span>`);
    }
    if (row.toolPreview !== null) expect(html).toContain(row.toolPreview);
  }
  expect(html.match(/data-turn-index=/g) ?? []).toHaveLength(testCase.expectedRows.length);
  expect(html.match(/data-turn-row=/g) ?? []).toHaveLength(testCase.expectedRows.length);
  expect(
    html.match(/class="txn-modelchange mono"/g) ?? [],
    `${testCase.name} must render its exact marker count`,
  ).toHaveLength(testCase.expectedMarkerCount);
  if (testCase.expectedMarkerText !== null) {
      const markerHtml = testCase.expectedMarkerText.replace(/ -> /g, " -&gt; ");
      expect(html.match(new RegExp(escaped(markerHtml), "g")) ?? []).toHaveLength(testCase.expectedMarkerCount);
  }
}

describe("mounted SessionDetail sticky compatibility", () => {
  it("passes the canonical detail object directly to the one Fairtrade adapter", () => {
    const sticky = fixture.cases.find(({ name }) => name === "sticky observations carry across omissions")!;
    const html = renderToStaticMarkup(<SessionDetail detail={sticky.session} turns={sticky.session.turns ?? undefined} />);
    expect(capture.calls).toHaveLength(1);
    expect(capture.calls[0]!.wire).toBe(sticky.session);
    expect(capture.calls[0]!.view.turns.map((turn) => turn.effectiveModel)).toEqual(sticky.expectedRows.map((row) => row.effectiveModel ?? undefined));
    assertRows(html, sticky);
  });

  it("resolves a hidden model boundary before the visible projection", () => {
    const projected = fixture.cases.find(({ name }) => name === "visible subset resolves hidden boundary")!;
    const html = renderToStaticMarkup(<SessionDetail detail={projected.session} turns={projected.suppliedTurns} turnsMode="visible" />);
    expect(capture.calls).toHaveLength(1);
    expect(capture.calls[0]!.wire).toBe(projected.session);
    expect(capture.calls[0]!.view.turns.map((turn) => turn.index)).toEqual(projected.suppliedTurns.map((turn) => turn.index));
    assertRows(html, projected);
  });

  it("renders every strict fixture replacement row with its own content, model, tools, and occurrence identity", () => {
    for (const testCase of fixture.cases.filter(({ turnsMode }) => turnsMode === "replace")) {
      capture.calls.length = 0;
      let graphTools: Map<number, ToolCallVM[]> | undefined;
      const html = renderToStaticMarkup(
        <SessionDetail
          detail={testCase.session}
          turns={testCase.suppliedTurns}
          turnsMode={testCase.turnsMode}
          initialTrajectoryMode={testCase.expectedGraphToolPreview === null ? "list" : "graph"}
          renderGraph={testCase.expectedGraphToolPreview === null ? undefined : ({ toolVMsByTurn }) => {
            graphTools = toolVMsByTurn;
            return <span data-testid="graph-mounted">graph</span>;
          }}
          renderTurnActions={() => <span data-testid="turn-actions">actions</span>}
          renderTurnPanel={() => <span data-testid="turn-panel">panel</span>}
          savedLabelsByEntry={new Map([[testCase.suppliedTurns[0]!.index, [{ entryIndex: testCase.suppliedTurns[0]!.index, typeId: "note", typeName: "note", value: "saved", id: "label-1" }]]])}
        />,
      );
      expect(capture.calls).toHaveLength(1);
      expect(capture.calls[0]!.wire.turns?.map((turn) => turn.index)).toEqual(testCase.suppliedTurns.map((turn) => turn.index));
      expect(capture.calls[0]!.wire.turns?.map((turn) => turn.content)).toEqual(testCase.expectedRows.map((row) => row.content));
      if (testCase.expectedGraphToolPreview === null) {
        assertRows(html, testCase);
        expect(html).toContain("turn-actions");
        expect(html).toContain("turn-panel");
        expect(html).toContain("saved");
      } else {
        expect(graphTools?.get(testCase.suppliedTurns[0]!.index)?.[0]?.preview).toBe(testCase.expectedGraphToolPreview);
      }
    }
  });

  it("does not rerun the adapter for identical props and does rerun it for changed detail", async () => {
    const legacy = fixture.cases.find(({ name }) => name === "legacy payload uses stable session fallback")!;
    const changed = fixture.cases.find(({ name }) => name === "same-index replacement changes content")!;
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);
    mountedRoots.push({ root, container });
    await act(async () => root.render(<SessionDetail detail={legacy.session} turns={legacy.suppliedTurns} />));
    expect(capture.calls).toHaveLength(1);
    await act(async () => root.render(<SessionDetail detail={legacy.session} turns={legacy.suppliedTurns} />));
    expect(capture.calls).toHaveLength(1);
    await act(async () => root.render(<SessionDetail detail={changed.session} turns={changed.suppliedTurns} />));
    expect(capture.calls).toHaveLength(2);
  });

  it("rejects count-preserving fixture name swaps", () => {
    for (const mutation of fixture.loaderMutations) {
      const source = fixture.source.replace(mutation.find, mutation.replace);
      expect(() => loadStickyCompatibilityFixture(source)).toThrow(new RegExp(mutation.expectedError));
    }
  });
});

describe("transcript-browser attribution ownership guard", () => {
  it("contains no local sticky resolver, carry-forward state, or marker derivation", () => {
    const offenders: string[] = [];
    for (const file of productionSourceFiles(SRC_ROOT)) {
      if (file.endsWith("lib/turn-alignment.ts")) continue;
      const code = stripComments(readFileSync(file, "utf8"));
      if (/\b(?:activeRoot|activeModel|lastModel|previousModel|carryForwardModel|resolveModel|deriveModel|stickyModel|modelState|modelTransition|priorModel|nextModel)\b/.test(code)
        || /(?:for|while)\s*\([^)]*(?:model|observ)/.test(code)) offenders.push(relative(SRC_ROOT, file));
    }
    expect(offenders, `model attribution must remain in Fairtrade; offenders: [${offenders.join(", ")}]`).toHaveLength(0);
  });

  it("has exactly one production adapter call after canonical turns are established", () => {
    const source = readFileSync(join(SRC_ROOT, "SessionDetail.tsx"), "utf8");
    const code = stripComments(source);
    expect(code.match(/\badaptTranscript\s*\(/g)).toHaveLength(1);
    expect(code.indexOf("const canonicalTurns = detail.turns ?? EMPTY_TURNS;")).toBeLessThan(code.indexOf("adaptTranscript("));
    expect(code.indexOf("const adapterOptions")).toBeLessThan(code.indexOf("adaptTranscript("));
  });
});

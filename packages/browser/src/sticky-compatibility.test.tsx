// @vitest-environment jsdom
import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { SessionDetailPayload } from "@peasant-labs/schema";
import type { TranscriptViewModel } from "@peasant-labs/fairtrade/ui";
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

const fixture = loadStickyCompatibilityFixture();
const SRC_ROOT = dirname(fileURLToPath(import.meta.url));

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

describe("mounted SessionDetail sticky compatibility", () => {
  it("passes the complete payload before projection and preserves Fairtrade A,A,B,B", () => {
    const sticky = fixture.cases.find(({ name }) => name === "sticky observations carry across omissions")!;
    capture.calls.length = 0;
    const html = renderToStaticMarkup(<SessionDetail detail={sticky.session} turns={sticky.suppliedTurns} />);
    expect(capture.calls).toHaveLength(1);
    const captured = capture.calls[0]!;
    const { wire, view } = captured;
    expect(wire.turns?.map((turn) => turn.index)).toEqual([0, 1, 2, 3]);
    expect(wire.turns?.map((turn) => turn.observedModel)).toEqual([
      "anthropic/claude-fable-5", undefined, "anthropic/claude-opus-4-8", undefined,
    ]);
    expect(view.turns.map((turn) => turn.effectiveModel)).toEqual([
      "anthropic/claude-fable-5", "anthropic/claude-fable-5",
      "anthropic/claude-opus-4-8", "anthropic/claude-opus-4-8",
    ]);
    expect(view.turns.filter((turn) => turn.modelChangedFrom)).toHaveLength(1);
    expect(view.turns[2]).toMatchObject({
      modelChangedFrom: "anthropic/claude-fable-5",
      effectiveModel: "anthropic/claude-opus-4-8",
    });
    expect(html.match(/model changed: anthropic\/claude-fable-5 -&gt; anthropic\/claude-opus-4-8/g)).toHaveLength(1);
  });

  it("keeps the legacy session fallback stable without transition markers", () => {
    const legacy = fixture.cases.find(({ name }) => name === "legacy payload uses stable session fallback")!;
    capture.calls.length = 0;
    const html = renderToStaticMarkup(<SessionDetail detail={legacy.session} turns={legacy.suppliedTurns} />);
    expect(capture.calls).toHaveLength(1);
    const view = capture.calls[0]!.view;
    expect(view.turns.map((turn) => turn.effectiveModel)).toEqual([
      "anthropic/claude-fable-5", "anthropic/claude-fable-5",
    ]);
    expect(view.turns.filter((turn) => turn.modelChangedFrom)).toHaveLength(0);
    expect(html.match(/model changed:/g) ?? []).toHaveLength(0);
  });

  it("resolves a hidden model boundary before the visible projection", () => {
    const sticky = fixture.cases.find(({ name }) => name === "sticky observations carry across omissions")!;
    capture.calls.length = 0;
    const html = renderToStaticMarkup(<SessionDetail detail={sticky.session} turns={[sticky.session.turns![0]!, sticky.session.turns![1]!, sticky.session.turns![3]!]} turnsMode="visible" />);
    const captured = capture.calls[0]!;
    expect(captured.wire.turns?.map((turn) => turn.index)).toEqual([0, 1, 2, 3]);
    expect(captured.view.turns.map((turn) => turn.index)).toEqual([0, 1, 3]);
    expect(captured.view.turns[2]).toMatchObject({ effectiveModel: "anthropic/claude-opus-4-8" });
    expect(captured.view.turns.some((turn) => turn.modelChangedFrom)).toBe(false);
    expect(html.match(/model changed:/g) ?? []).toHaveLength(0);
  });

  it("does not attribute a non-assistant observation", () => {
    const nonAssistant = fixture.cases.find(({ name }) => name === "non-assistant observations stay out of attribution")!;
    capture.calls.length = 0;
    renderToStaticMarkup(<SessionDetail detail={nonAssistant.session} turns={nonAssistant.suppliedTurns} />);
    const view = capture.calls[0]!.view;
    expect(view.turns[0]).not.toHaveProperty("effectiveModel");
    expect(view.turns[1]).toMatchObject({ effectiveModel: "anthropic/claude-fable-5" });
    expect(view.turns.filter((turn) => turn.modelChangedFrom)).toHaveLength(0);
  });

  it("keeps same-index replacement content and duplicate/reordered replacement rows", () => {
    const replacement = fixture.cases.find(({ name }) => name === "overlapping replacement preserves supplied content")!;
    const first = replacement.suppliedTurns![0]!;
    const duplicate = [first, { ...first, content: "same-index changed content" }];
    capture.calls.length = 0;
    const html = renderToStaticMarkup(<SessionDetail detail={replacement.session} turns={[duplicate[1]!, duplicate[0]!]} />);
    expect(capture.calls[0]!.wire.turns?.map((turn) => turn.content)).toEqual(["same-index changed content", "replacement content"]);
    expect(html).toContain("same-index changed content");
  });

  it("rejects a count-preserving fixture name swap", () => {
    for (const mutation of fixture.loaderMutations) {
      const mutated = fixture.source.replace(mutation.find, mutation.replace);
      expect(() => loadStickyCompatibilityFixture(mutated)).toThrow(new RegExp(mutation.expectedError));
    }
  });
});

describe("transcript-browser attribution ownership guard", () => {
  it("contains no local resolver, carry-forward state, or marker derivation", () => {
    const offenders: string[] = [];
    for (const file of productionSourceFiles(SRC_ROOT)) {
      const code = stripComments(readFileSync(file, "utf8"));
      if (/\b(?:effectiveModel|modelChangedFrom|observedModel)\s*[:=]/.test(code)
        || /\b(?:activeRoot|activeModel|lastModel|previousModel|carryForwardModel|resolveModel|deriveModel|stickyModel|modelState|modelTransition|priorModel|nextModel)\b/.test(code)
        || /\bmodelChanged\b|model changed:/.test(code)
        || /(?:for|while)\s*\([^)]*(?:model|observ)/.test(code)) offenders.push(relative(SRC_ROOT, file));
    }
    expect(offenders, `model attribution must remain in Fairtrade; offenders: [${offenders.join(", ")}]`).toHaveLength(0);
  });

  it("has one production adapter call after canonical turns are established", () => {
    const source = readFileSync(join(SRC_ROOT, "SessionDetail.tsx"), "utf8");
    const code = stripComments(source);
    expect(code.match(/\badaptTranscript\s*\(/g)).toHaveLength(1);
    expect(code.indexOf("const canonicalTurns = detail.turns ?? [];")).toBeLessThan(code.indexOf("adaptTranscript("));
    expect(code.indexOf("visibleTurnIndices")).toBeGreaterThan(code.indexOf("adaptTranscript("));
  });
});

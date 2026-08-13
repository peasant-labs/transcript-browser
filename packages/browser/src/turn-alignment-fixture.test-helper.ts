import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { ToolCallVM, TurnVM } from "@peasant-labs/fairtrade/ui";
import type { TurnDetail } from "@peasant-labs/schema";
import type { AlignedTurnRow, AlignmentDiagnostic, RowAlignment, TurnRowKey } from "./lib/turn-alignment.js";
import {
  parseStrictYamlObject,
  requireExactFields,
  requireNonEmptyString,
  requireSafeNonnegativeInteger,
  requireSingleOccurrence,
  requireUniqueStringSet,
} from "./strict-yaml-fixture.test-helper.js";

type LoaderMutation = { name: string; find: string; replace: string; expectedError: string };

export interface TurnAlignmentFixtureCase {
  name: string;
  mode: "replace" | "visible";
  displayTurns: TurnDetail[];
  vmTurns: TurnVM[];
  expectedRows: AlignedTurnRow[];
  expectedDiagnostics: AlignmentDiagnostic[];
  aliasPairs: Array<{ aliasPosition: number; targetPosition: number }>;
}

export interface TurnAlignmentFixture {
  cases: TurnAlignmentFixtureCase[];
  loaderMutations: LoaderMutation[];
  source: string;
}

const casesPath = resolve(process.cwd(), "src/testdata/turn-alignment.yaml");
const manifestPath = resolve(process.cwd(), "src/testdata/turn-alignment.manifest.yaml");

function requireObject(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${label} must be an object`);
  return value as Record<string, unknown>;
}

function parseDisplayTurns(raw: unknown, label: string): {
  turns: TurnDetail[];
  byRef: Map<string, TurnDetail>;
  positionByRef: Map<string, number>;
  aliases: Array<{ aliasPosition: number; targetPosition: number }>;
} {
  if (!Array.isArray(raw)) throw new Error(`${label} must be an array`);
  const turns: TurnDetail[] = [];
  const byRef = new Map<string, TurnDetail>();
  const positionByRef = new Map<string, number>();
  const aliases: Array<{ aliasPosition: number; targetPosition: number }> = [];

  raw.forEach((value, position) => {
    const row = requireObject(value, `${label}[${position}]`);
    const isAlias = Object.hasOwn(row, "aliasOf");
    requireExactFields(row, isAlias ? ["ref", "aliasOf"] : ["ref", "index", "content"], `${label}[${position}]`);
    requireNonEmptyString(row.ref, `${label}[${position}].ref`);
    if (byRef.has(row.ref)) throw new Error(`${label}[${position}].ref must be unique`);

    let turn: TurnDetail;
    if (isAlias) {
      requireNonEmptyString(row.aliasOf, `${label}[${position}].aliasOf`);
      const target = byRef.get(row.aliasOf);
      const targetPosition = positionByRef.get(row.aliasOf);
      if (!target || targetPosition === undefined) throw new Error(`${label}[${position}].aliasOf must reference an earlier row`);
      turn = target;
      aliases.push({ aliasPosition: position, targetPosition });
    } else {
      requireSafeNonnegativeInteger(row.index, `${label}[${position}].index`);
      requireNonEmptyString(row.content, `${label}[${position}].content`);
      turn = {
        index: row.index,
        role: "assistant",
        content: row.content,
        timestamp: `2026-08-13T00:${String(position).padStart(2, "0")}:00Z`,
        depth: 0,
      };
    }
    turns.push(turn);
    byRef.set(row.ref, turn);
    positionByRef.set(row.ref, position);
  });

  return { turns, byRef, positionByRef, aliases };
}

function parseVMs(raw: unknown, label: string): { turns: TurnVM[]; byRef: Map<string, TurnVM> } {
  if (!Array.isArray(raw)) throw new Error(`${label} must be an array`);
  const turns: TurnVM[] = [];
  const byRef = new Map<string, TurnVM>();
  raw.forEach((value, position) => {
    const row = requireObject(value, `${label}[${position}]`);
    requireExactFields(row, ["ref", "index", "content", "effectiveModel", "toolPreviews"], `${label}[${position}]`);
    requireNonEmptyString(row.ref, `${label}[${position}].ref`);
    if (byRef.has(row.ref)) throw new Error(`${label}[${position}].ref must be unique`);
    requireSafeNonnegativeInteger(row.index, `${label}[${position}].index`);
    requireNonEmptyString(row.content, `${label}[${position}].content`);
    if (row.effectiveModel !== null) requireNonEmptyString(row.effectiveModel, `${label}[${position}].effectiveModel`);
    if (!Array.isArray(row.toolPreviews)) throw new Error(`${label}[${position}].toolPreviews must be an array`);
    row.toolPreviews.forEach((preview, previewIndex) => requireNonEmptyString(preview, `${label}[${position}].toolPreviews[${previewIndex}]`));
    const toolCalls = (row.toolPreviews as string[]).map((preview, previewIndex): ToolCallVM => ({
      id: `${row.ref}-tool-${previewIndex}`,
      name: "Bash",
      kind: "execute",
      group: "bash",
      preview,
    }));
    const turn: TurnVM = {
      index: row.index,
      role: "assistant",
      label: String(position + 1),
      content: row.content,
      depth: 0,
      toolCalls,
      annotations: [],
      ...(row.effectiveModel === null ? {} : { effectiveModel: row.effectiveModel as string }),
    };
    turns.push(turn);
    byRef.set(row.ref, turn);
  });
  return { turns, byRef };
}

function parseDiagnostics(raw: unknown, label: string): AlignmentDiagnostic[] {
  if (!Array.isArray(raw)) throw new Error(`${label} must be an array`);
  return raw.map((value, index) => {
    const row = requireObject(value, `${label}[${index}]`);
    requireExactFields(row, ["what", "why", "where", "when", "meaning", "fix"], `${label}[${index}]`);
    for (const field of ["what", "why", "where", "when", "meaning", "fix"] as const) {
      requireNonEmptyString(row[field], `${label}[${index}].${field}`);
    }
    return row as unknown as AlignmentDiagnostic;
  });
}

function parseLoaderMutations(raw: unknown, expectedCount: number, anchorSource: string): LoaderMutation[] {
  if (!Array.isArray(raw) || raw.length !== expectedCount) throw new Error("turn alignment loader mutations must match their declared count");
  const mutations = raw.map((value, index) => {
    const row = requireObject(value, `turn alignment loader mutation ${index}`);
    requireExactFields(row, ["name", "find", "replace", "expectedError"], `turn alignment loader mutation ${index}`);
    for (const field of ["name", "find", "replace", "expectedError"] as const) {
      requireNonEmptyString(row[field], `turn alignment loader mutation ${index}.${field}`);
    }
    requireSingleOccurrence(anchorSource, row.find as string, `turn alignment loader mutation ${index}`);
    return row as LoaderMutation;
  });
  if (new Set(mutations.map(({ name }) => name)).size !== mutations.length) throw new Error("turn alignment loader mutation names must be unique");
  return mutations;
}

export function loadTurnAlignmentFixture(
  source = readFileSync(casesPath, "utf8"),
  manifestSource = readFileSync(manifestPath, "utf8"),
  mutationAnchorSource = readFileSync(casesPath, "utf8"),
): TurnAlignmentFixture {
  const manifest = parseStrictYamlObject(manifestSource, "turn alignment manifest");
  requireExactFields(manifest, ["expectedCaseCount", "requiredCaseNames", "expectedLoaderMutationCount", "loaderMutations"], "turn alignment manifest");
  requireSafeNonnegativeInteger(manifest.expectedCaseCount, "turn alignment manifest.expectedCaseCount");
  requireSafeNonnegativeInteger(manifest.expectedLoaderMutationCount, "turn alignment manifest.expectedLoaderMutationCount");
  const requiredNames = requireUniqueStringSet(manifest.requiredCaseNames, "turn alignment manifest.requiredCaseNames");
  if (requiredNames.length !== manifest.expectedCaseCount) throw new Error("turn alignment manifest names must match expectedCaseCount");
  const loaderMutations = parseLoaderMutations(manifest.loaderMutations, manifest.expectedLoaderMutationCount, mutationAnchorSource);

  const root = parseStrictYamlObject(source, "turn alignment fixture");
  requireExactFields(root, ["expectedCaseCount", "cases"], "turn alignment fixture");
  requireSafeNonnegativeInteger(root.expectedCaseCount, "turn alignment fixture.expectedCaseCount");
  if (!Array.isArray(root.cases) || root.cases.length !== root.expectedCaseCount || root.expectedCaseCount !== manifest.expectedCaseCount) {
    throw new Error("turn alignment fixture counts must match root and manifest");
  }

  const names = new Set<string>();
  const cases = root.cases.map((value, caseIndex): TurnAlignmentFixtureCase => {
    const row = requireObject(value, `turn alignment case ${caseIndex}`);
    requireExactFields(row, ["name", "mode", "displayTurns", "vmTurns", "expectedRows", "expectedDiagnostics"], `turn alignment case ${caseIndex}`);
    requireNonEmptyString(row.name, `turn alignment case ${caseIndex}.name`);
    if (names.has(row.name)) throw new Error(`turn alignment case name ${row.name} is duplicate`);
    names.add(row.name);
    if (row.mode !== "replace" && row.mode !== "visible") throw new Error(`turn alignment case ${row.name}.mode must be replace or visible`);
    const display = parseDisplayTurns(row.displayTurns, `turn alignment case ${row.name}.displayTurns`);
    const viewModels = parseVMs(row.vmTurns, `turn alignment case ${row.name}.vmTurns`);
    if (!Array.isArray(row.expectedRows) || row.expectedRows.length !== display.turns.length) {
      throw new Error(`turn alignment case ${row.name}.expectedRows must match display turn count`);
    }
    const expectedRows = row.expectedRows.map((expectedValue, position): AlignedTurnRow => {
      const expected = requireObject(expectedValue, `turn alignment case ${row.name}.expectedRows[${position}]`);
      requireExactFields(expected, ["key", "index", "occurrence", "turnRef", "cookedRef", "alignment"], `turn alignment case ${row.name}.expectedRows[${position}]`);
      requireNonEmptyString(expected.key, `turn alignment case ${row.name}.expectedRows[${position}].key`);
      requireSafeNonnegativeInteger(expected.index, `turn alignment case ${row.name}.expectedRows[${position}].index`);
      requireSafeNonnegativeInteger(expected.occurrence, `turn alignment case ${row.name}.expectedRows[${position}].occurrence`);
      requireNonEmptyString(expected.turnRef, `turn alignment case ${row.name}.expectedRows[${position}].turnRef`);
      if (expected.cookedRef !== null) requireNonEmptyString(expected.cookedRef, `turn alignment case ${row.name}.expectedRows[${position}].cookedRef`);
      if (expected.alignment !== "aligned" && expected.alignment !== "unaligned") throw new Error(`turn alignment case ${row.name}.expectedRows[${position}].alignment must be aligned or unaligned`);
      const turn = display.byRef.get(expected.turnRef);
      if (!turn) throw new Error(`turn alignment case ${row.name}.expectedRows[${position}].turnRef is unknown`);
      const cooked = expected.cookedRef === null ? null : viewModels.byRef.get(expected.cookedRef as string);
      if (cooked === undefined) throw new Error(`turn alignment case ${row.name}.expectedRows[${position}].cookedRef is unknown`);
      if ((expected.alignment === "aligned") !== (cooked !== null)) throw new Error(`turn alignment case ${row.name}.expectedRows[${position}] alignment and cookedRef disagree`);
      if (expected.key !== `${expected.index}:${expected.occurrence}`) throw new Error(`turn alignment case ${row.name}.expectedRows[${position}].key must encode index and occurrence`);
      return {
        key: expected.key as TurnRowKey,
        turn,
        index: expected.index,
        occurrence: expected.occurrence,
        cooked,
        toolVMs: cooked?.toolCalls ?? null,
        alignment: expected.alignment as RowAlignment,
      };
    });
    return {
      name: row.name,
      mode: row.mode,
      displayTurns: display.turns,
      vmTurns: viewModels.turns,
      expectedRows,
      expectedDiagnostics: parseDiagnostics(row.expectedDiagnostics, `turn alignment case ${row.name}.expectedDiagnostics`),
      aliasPairs: display.aliases,
    };
  });
  if (names.size !== requiredNames.length || requiredNames.some((name) => !names.has(name))) {
    throw new Error("turn alignment fixture required names must exactly match cases");
  }
  return { cases, loaderMutations, source };
}

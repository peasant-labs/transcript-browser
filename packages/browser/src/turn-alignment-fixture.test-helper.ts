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

interface ParsedViewModels {
  turns: TurnVM[];
  byRef: Map<string, TurnVM>;
  positionByRef: Map<string, number>;
}

export interface TurnAlignmentFixture {
  cases: TurnAlignmentFixtureCase[];
  loaderMutations: LoaderMutation[];
  oracleMutations: LoaderMutation[];
  source: string;
}

const casesPath = resolve(process.cwd(), "src/testdata/turn-alignment.yaml");
const manifestPath = resolve(process.cwd(), "src/testdata/turn-alignment.manifest.yaml");
const mutationManifestPath = resolve(process.cwd(), "src/testdata/turn-alignment.mutations.yaml");

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

function parseVMs(raw: unknown, label: string): ParsedViewModels {
  if (!Array.isArray(raw)) throw new Error(`${label} must be an array`);
  const turns: TurnVM[] = [];
  const byRef = new Map<string, TurnVM>();
  const positionByRef = new Map<string, number>();
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
    positionByRef.set(row.ref, position);
  });
  return { turns, byRef, positionByRef };
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

function expectedRowError(
  what: string,
  why: string,
  where: string,
  meaning: string,
  fix: string,
): Error {
  return new Error([
    `what: ${what}`,
    `why: ${why}`,
    `where: ${where}`,
    "when: While loading the turn-alignment expected-row oracle before executing its alignment case.",
    `meaning: ${meaning}`,
    `fix: ${fix}`,
  ].join("\n"));
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
  if (new Set(mutations.map(({ expectedError }) => expectedError)).size !== mutations.length) throw new Error("turn alignment loader mutations must each assert an independent error");
  return mutations;
}

export function loadTurnAlignmentFixture(
  source = readFileSync(casesPath, "utf8"),
  manifestSource = readFileSync(manifestPath, "utf8"),
  mutationAnchorSource = readFileSync(casesPath, "utf8"),
  mutationManifestSource = readFileSync(mutationManifestPath, "utf8"),
): TurnAlignmentFixture {
  const manifest = parseStrictYamlObject(manifestSource, "turn alignment manifest");
  requireExactFields(manifest, ["expectedCaseCount", "requiredCaseNames", "expectedLoaderMutationCount", "loaderMutations"], "turn alignment manifest");
  requireSafeNonnegativeInteger(manifest.expectedCaseCount, "turn alignment manifest.expectedCaseCount");
  requireSafeNonnegativeInteger(manifest.expectedLoaderMutationCount, "turn alignment manifest.expectedLoaderMutationCount");
  const requiredNames = requireUniqueStringSet(manifest.requiredCaseNames, "turn alignment manifest.requiredCaseNames");
  if (requiredNames.length !== manifest.expectedCaseCount) throw new Error("turn alignment manifest names must match expectedCaseCount");
  const loaderMutations = parseLoaderMutations(manifest.loaderMutations, manifest.expectedLoaderMutationCount, mutationAnchorSource);
  const mutationManifest = parseStrictYamlObject(mutationManifestSource, "turn alignment mutation manifest");
  requireExactFields(mutationManifest, ["expectedMutationCount", "expectedLoaderMutationCount", "loaderMutations", "mutations"], "turn alignment mutation manifest");
  requireSafeNonnegativeInteger(mutationManifest.expectedMutationCount, "turn alignment mutation manifest.expectedMutationCount");
  requireSafeNonnegativeInteger(mutationManifest.expectedLoaderMutationCount, "turn alignment mutation manifest.expectedLoaderMutationCount");
  if (!Array.isArray(mutationManifest.mutations) || mutationManifest.mutations.length !== mutationManifest.expectedMutationCount) {
    throw new Error("turn alignment mutation manifest production mutations must match their declared count");
  }
  const oracleMutations = parseLoaderMutations(
    mutationManifest.loaderMutations,
    mutationManifest.expectedLoaderMutationCount,
    mutationAnchorSource,
  );

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
    const occurrenceCounts = new Map<number, number>();
    const expectedRows = row.expectedRows.map((expectedValue, position): AlignedTurnRow => {
      const expectedLabel = `turn alignment case ${row.name}.expectedRows[${position}]`;
      const expected = requireObject(expectedValue, expectedLabel);
      requireExactFields(expected, ["key", "index", "occurrence", "turnRef", "cookedRef", "cookedContent", "alignment"], expectedLabel);
      requireNonEmptyString(expected.key, `${expectedLabel}.key`);
      requireSafeNonnegativeInteger(expected.index, `${expectedLabel}.index`);
      requireSafeNonnegativeInteger(expected.occurrence, `${expectedLabel}.occurrence`);
      requireNonEmptyString(expected.turnRef, `${expectedLabel}.turnRef`);
      if (expected.cookedRef !== null) {
        requireNonEmptyString(expected.cookedRef, `${expectedLabel}.cookedRef`);
        requireNonEmptyString(expected.cookedContent, `${expectedLabel}.cookedContent`);
      } else if (expected.cookedContent !== null) {
        throw expectedRowError(
          "Turn-alignment expected row has cooked content without a view-model reference.",
          `cookedContent must be null when cookedRef is null at position ${position}.`,
          `${expectedLabel}.cookedContent`,
          "The fixture oracle could describe cooked data that no referenced Fairtrade row supplies.",
          `Set cookedContent to null, or provide the aligned cookedRef whose content it describes.`,
        );
      }
      if (expected.alignment !== "aligned" && expected.alignment !== "unaligned") throw new Error(`${expectedLabel}.alignment must be aligned or unaligned`);
      const turn = display.turns[position]!;
      const referencedTurn = display.byRef.get(expected.turnRef);
      const referencedPosition = display.positionByRef.get(expected.turnRef);
      if (!referencedTurn || referencedPosition === undefined) throw new Error(`${expectedLabel}.turnRef is unknown`);
      if (referencedPosition !== position || referencedTurn !== turn) {
        throw expectedRowError(
          "Turn-alignment expected row references the wrong display turn.",
          `turnRef ${expected.turnRef} resolves to a different display row than position ${position}.`,
          `${expectedLabel}.turnRef`,
          "The fixture oracle could compare alignment output against shifted wire content and pass for the wrong scenario.",
          `Set turnRef to the displayTurns reference at position ${position}.`,
        );
      }
      const derivedOccurrence = occurrenceCounts.get(turn.index) ?? 0;
      occurrenceCounts.set(turn.index, derivedOccurrence + 1);
      if (expected.index !== turn.index) {
        throw expectedRowError(
          "Turn-alignment expected row has the wrong index.",
          `Expected index ${expected.index} does not equal display turn index ${turn.index} at position ${position}.`,
          `${expectedLabel}.index`,
          "The fixture oracle no longer describes the wire row that the production aligner receives.",
          `Set index to ${turn.index}, matching displayTurns[${position}].`,
        );
      }
      if (expected.occurrence !== derivedOccurrence) {
        throw expectedRowError(
          "Turn-alignment expected row has the wrong occurrence ordinal.",
          `Expected occurrence ${expected.occurrence} does not equal derived occurrence ${derivedOccurrence} for index ${turn.index} at position ${position}.`,
          `${expectedLabel}.occurrence`,
          "The fixture oracle could assign cooked data to the wrong repeated row occurrence.",
          `Set occurrence to ${derivedOccurrence}, the zero-based occurrence derived from displayTurns through position ${position}.`,
        );
      }
      const derivedKey = `${turn.index}:${derivedOccurrence}`;
      if (expected.key !== derivedKey) {
        throw expectedRowError(
          "Turn-alignment expected row has the wrong key.",
          `Expected key ${expected.key} does not equal derived key ${derivedKey} at position ${position}.`,
          `${expectedLabel}.key`,
          "The fixture oracle could assert a row identity that production cannot derive from the display list.",
          `Set key to ${derivedKey}, derived from the display turn index and occurrence.`,
        );
      }
      const cooked = expected.cookedRef === null ? null : viewModels.byRef.get(expected.cookedRef as string);
      if (cooked === undefined) throw new Error(`${expectedLabel}.cookedRef is unknown`);
      if ((expected.alignment === "aligned") !== (cooked !== null)) {
        throw expectedRowError(
          "Turn-alignment expected row has inconsistent alignment state.",
          `${expected.alignment} requires cookedRef to be ${expected.alignment === "aligned" ? "a VM reference" : "null"}.`,
          `${expectedLabel}.alignment and ${expectedLabel}.cookedRef`,
          "The fixture oracle could claim cooked enrichment exists while returning none, or enrich a row declared unaligned.",
          `Use a non-null cookedRef only for aligned rows and null only for unaligned rows at position ${position}.`,
        );
      }
      if (cooked !== null && cooked.index !== expected.index) {
        throw expectedRowError(
          "Turn-alignment expected row references an incompatible Fairtrade view model.",
          `cookedRef ${expected.cookedRef as string} resolved to index ${cooked.index}, but the expected display row requires index ${expected.index}.`,
          `${expectedLabel}.cookedRef`,
          "The fixture oracle could attach cooked attribution or tools from a different transcript row.",
          `Reference a VM row whose index matches displayTurns[${position}], or mark this expected row unaligned with cookedRef null.`,
        );
      }
      if (cooked !== null && row.mode === "replace" && viewModels.positionByRef.get(expected.cookedRef as string) !== position) {
        throw expectedRowError(
          "Turn-alignment replacement oracle references a view model from the wrong position.",
          `cookedRef ${expected.cookedRef as string} does not resolve to vmTurns[${position}] for this positional replacement row.`,
          `${expectedLabel}.cookedRef`,
          "The fixture oracle could attach same-index cooked attribution or tools from a neighboring replacement row.",
          `Set cookedRef to the vmTurns reference at position ${position}, or mark this expected row unaligned with cookedRef null.`,
        );
      }
      if (cooked !== null && cooked.content !== expected.cookedContent) {
        throw expectedRowError(
          "Turn-alignment expected row references a view model with unexpected content.",
          `cookedRef ${expected.cookedRef as string} resolved to content ${JSON.stringify(cooked.content)}, but cookedContent requires ${JSON.stringify(expected.cookedContent)}.`,
          `${expectedLabel}.cookedRef and ${expectedLabel}.cookedContent`,
          "The fixture oracle could attach cooked attribution or tools from a different transcript row.",
          `Set cookedRef to the VM row carrying the declared cookedContent, or correct cookedContent to the independently expected VM text.`,
        );
      }
      return {
        key: derivedKey as TurnRowKey,
        turn,
        index: turn.index,
        occurrence: derivedOccurrence,
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
  return { cases, loaderMutations, oracleMutations, source };
}

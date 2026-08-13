import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { SessionDetailPayload, TurnDetail } from "@peasant-labs/schema";
import {
  parseStrictYamlObject,
  requireExactFields,
  requireNonEmptyString,
  requireSafeNonnegativeInteger,
  requireSingleOccurrence,
  requireUniqueStringSet,
} from "./strict-yaml-fixture.test-helper.js";

export interface StickyExpectedRow {
  content: string;
  effectiveModel: string | null;
  toolPreview: string | null;
  id: string;
  rowKey: string;
}

export interface StickyCompatibilityCase {
  name: string;
  session: SessionDetailPayload;
  turnsMode: "replace" | "visible";
  suppliedTurns: TurnDetail[];
  expectedRows: StickyExpectedRow[];
  expectedMarkerCount: number;
  expectedMarkerText: string | null;
  expectedGraphToolPreview: string | null;
}

export interface StickyCompatibilityFixture {
  cases: StickyCompatibilityCase[];
  loaderMutations: Array<{ name: string; find: string; replace: string; expectedError: string }>;
  source: string;
}

const casesPath = resolve(process.cwd(), "src/testdata/sticky-compatibility.yaml");
const manifestPath = resolve(process.cwd(), "src/testdata/sticky-compatibility.manifest.yaml");

function object(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${label} must be an object`);
  return value as Record<string, unknown>;
}

function parseTurns(raw: unknown, label: string): { turns: TurnDetail[]; byRef: Map<string, TurnDetail> } {
  if (!Array.isArray(raw)) throw new Error(`${label} must be an array`);
  const byRef = new Map<string, TurnDetail>();
  const turns = raw.map((value, index) => {
    const row = object(value, `${label}[${index}]`);
    const optional = ["observedModel", "toolPreview"].filter((field) => Object.hasOwn(row, field));
    requireExactFields(row, ["ref", "index", "role", "content", "timestamp", "depth", ...optional], `${label}[${index}]`);
    requireNonEmptyString(row.ref, `${label}[${index}].ref`);
    if (byRef.has(row.ref)) throw new Error(`${label}[${index}].ref must be unique`);
    requireSafeNonnegativeInteger(row.index, `${label}[${index}].index`);
    requireNonEmptyString(row.role, `${label}[${index}].role`);
    if (row.role !== "assistant" && row.role !== "user") throw new Error(`${label}[${index}].role must be assistant or user`);
    requireNonEmptyString(row.content, `${label}[${index}].content`);
    requireNonEmptyString(row.timestamp, `${label}[${index}].timestamp`);
    if (!Number.isFinite(Date.parse(row.timestamp))) throw new Error(`${label}[${index}].timestamp must be RFC3339-compatible`);
    requireSafeNonnegativeInteger(row.depth, `${label}[${index}].depth`);
    if (Object.hasOwn(row, "observedModel")) requireNonEmptyString(row.observedModel, `${label}[${index}].observedModel`);
    if (Object.hasOwn(row, "toolPreview")) requireNonEmptyString(row.toolPreview, `${label}[${index}].toolPreview`);
    const turn: TurnDetail = {
      index: row.index,
      role: row.role,
      content: row.content,
      timestamp: row.timestamp,
      depth: row.depth,
      ...(Object.hasOwn(row, "observedModel") ? { observedModel: row.observedModel as string } : {}),
      ...(Object.hasOwn(row, "toolPreview") ? {
        toolCalls: [{
          id: `${row.ref}-tool`,
          name: "Bash",
          arguments: JSON.stringify({ command: row.toolPreview }),
          result: "",
          toolKind: "execute",
        }],
      } : {}),
    };
    byRef.set(row.ref, turn);
    return turn;
  });
  return { turns, byRef };
}

function parseSuppliedTurns(raw: unknown, label: string, byRef: Map<string, TurnDetail>): TurnDetail[] {
  if (!Array.isArray(raw)) throw new Error(`${label} must be an array`);
  return raw.map((value, index) => {
    const row = object(value, `${label}[${index}]`);
    const optional = ["index", "content"].filter((field) => Object.hasOwn(row, field));
    requireExactFields(row, ["sourceRef", ...optional], `${label}[${index}]`);
    requireNonEmptyString(row.sourceRef, `${label}[${index}].sourceRef`);
    const source = byRef.get(row.sourceRef);
    if (!source) throw new Error(`${label}[${index}].sourceRef must name a canonical turn`);
    if (Object.hasOwn(row, "index")) requireSafeNonnegativeInteger(row.index, `${label}[${index}].index`);
    if (Object.hasOwn(row, "content")) requireNonEmptyString(row.content, `${label}[${index}].content`);
    if (!Object.hasOwn(row, "index") && !Object.hasOwn(row, "content")) return source;
    return {
      ...source,
      ...(Object.hasOwn(row, "index") ? { index: row.index as number } : {}),
      ...(Object.hasOwn(row, "content") ? { content: row.content as string } : {}),
    };
  });
}

function nullableString(value: unknown, label: string): string | null {
  if (value === null) return null;
  requireNonEmptyString(value, label);
  return value;
}

export function loadStickyCompatibilityFixture(
  source = readFileSync(casesPath, "utf8"),
  manifestSource = readFileSync(manifestPath, "utf8"),
  mutationAnchorSource = readFileSync(casesPath, "utf8"),
): StickyCompatibilityFixture {
  const manifest = parseStrictYamlObject(manifestSource, "sticky compatibility manifest");
  requireExactFields(manifest, ["expectedCaseCount", "requiredCaseNames", "expectedLoaderMutationCount", "loaderMutations"], "sticky compatibility manifest");
  requireSafeNonnegativeInteger(manifest.expectedCaseCount, "sticky compatibility manifest.expectedCaseCount");
  requireSafeNonnegativeInteger(manifest.expectedLoaderMutationCount, "sticky compatibility manifest.expectedLoaderMutationCount");
  const requiredNames = requireUniqueStringSet(manifest.requiredCaseNames, "sticky compatibility manifest.requiredCaseNames");
  if (requiredNames.length !== manifest.expectedCaseCount) throw new Error("sticky compatibility manifest names must match expectedCaseCount");
  if (!Array.isArray(manifest.loaderMutations) || manifest.loaderMutations.length !== manifest.expectedLoaderMutationCount) throw new Error("sticky compatibility manifest loader mutations must match their declared count");
  const loaderMutations = manifest.loaderMutations.map((value, index) => {
    const row = object(value, `sticky compatibility loader mutation ${index}`);
    requireExactFields(row, ["name", "find", "replace", "expectedError"], `sticky compatibility loader mutation ${index}`);
    for (const field of ["name", "find", "replace", "expectedError"] as const) requireNonEmptyString(row[field], `sticky compatibility loader mutation ${index}.${field}`);
    requireSingleOccurrence(mutationAnchorSource, row.find as string, `sticky compatibility loader mutation ${index}`);
    return row as { name: string; find: string; replace: string; expectedError: string };
  });
  if (new Set(loaderMutations.map(({ name }) => name)).size !== loaderMutations.length) throw new Error("sticky compatibility loader mutation names must be unique");

  const root = parseStrictYamlObject(source, "sticky compatibility fixture");
  requireExactFields(root, ["expectedCaseCount", "cases"], "sticky compatibility fixture");
  requireSafeNonnegativeInteger(root.expectedCaseCount, "sticky compatibility fixture.expectedCaseCount");
  if (!Array.isArray(root.cases) || root.cases.length !== root.expectedCaseCount || root.expectedCaseCount !== manifest.expectedCaseCount) throw new Error("sticky compatibility fixture counts must match root and manifest");
  const names = new Set<string>();
  const cases = root.cases.map((value, index): StickyCompatibilityCase => {
    const row = object(value, `sticky compatibility case ${index}`);
    requireExactFields(row, ["name", "sessionModel", "turns", "turnsMode", "suppliedTurns", "expectedRows", "expectedMarkerCount", "expectedMarkerText", "expectedGraphToolPreview"], `sticky compatibility case ${index}`);
    requireNonEmptyString(row.name, `sticky compatibility case ${index}.name`);
    if (names.has(row.name)) throw new Error(`sticky compatibility case name ${row.name} is duplicate`);
    names.add(row.name);
    requireNonEmptyString(row.sessionModel, `sticky compatibility case ${row.name}.sessionModel`);
    if (row.turnsMode !== "replace" && row.turnsMode !== "visible") throw new Error(`sticky compatibility case ${row.name}.turnsMode must be replace or visible`);
    requireSafeNonnegativeInteger(row.expectedMarkerCount, `sticky compatibility case ${row.name}.expectedMarkerCount`);
    const expectedMarkerText = nullableString(row.expectedMarkerText, `sticky compatibility case ${row.name}.expectedMarkerText`);
    if ((row.expectedMarkerCount === 0) !== (expectedMarkerText === null)) throw new Error(`sticky compatibility case ${row.name} marker count and text disagree`);
    const expectedGraphToolPreview = nullableString(row.expectedGraphToolPreview, `sticky compatibility case ${row.name}.expectedGraphToolPreview`);
    const parsed = parseTurns(row.turns, `sticky compatibility case ${row.name}.turns`);
    const suppliedTurns = parseSuppliedTurns(row.suppliedTurns, `sticky compatibility case ${row.name}.suppliedTurns`, parsed.byRef);
    if (!Array.isArray(row.expectedRows) || row.expectedRows.length !== suppliedTurns.length) throw new Error(`sticky compatibility case ${row.name}.expectedRows must match supplied turn count`);
    const expectedRows = row.expectedRows.map((expectedValue, rowIndex): StickyExpectedRow => {
      const expected = object(expectedValue, `sticky compatibility case ${row.name}.expectedRows[${rowIndex}]`);
      requireExactFields(expected, ["content", "effectiveModel", "toolPreview", "id", "rowKey"], `sticky compatibility case ${row.name}.expectedRows[${rowIndex}]`);
      requireNonEmptyString(expected.content, `sticky compatibility case ${row.name}.expectedRows[${rowIndex}].content`);
      requireNonEmptyString(expected.id, `sticky compatibility case ${row.name}.expectedRows[${rowIndex}].id`);
      requireNonEmptyString(expected.rowKey, `sticky compatibility case ${row.name}.expectedRows[${rowIndex}].rowKey`);
      return {
        content: expected.content,
        effectiveModel: nullableString(expected.effectiveModel, `sticky compatibility case ${row.name}.expectedRows[${rowIndex}].effectiveModel`),
        toolPreview: nullableString(expected.toolPreview, `sticky compatibility case ${row.name}.expectedRows[${rowIndex}].toolPreview`),
        id: expected.id,
        rowKey: expected.rowKey,
      };
    });
    const session: SessionDetailPayload = {
      id: `sticky-compatibility-${index}`,
      harness: "claude-code",
      model: row.sessionModel,
      startTime: "2026-08-13T00:00:00Z",
      endTime: "2026-08-13T00:10:00Z",
      durationMins: 10,
      totalTokens: 0,
      tokensIn: 0,
      tokensOut: 0,
      turnCount: parsed.turns.length,
      toolCallCount: parsed.turns.reduce((sum, turn) => sum + (turn.toolCalls?.length ?? 0), 0),
      workingDirectory: `/work/sticky-compatibility-${index}`,
      gitBranch: "main",
      gitRemote: "https://example.test/sticky-compatibility.git",
      scorecard: null,
      turns: parsed.turns,
    };
    return {
      name: row.name,
      session,
      turnsMode: row.turnsMode,
      suppliedTurns,
      expectedRows,
      expectedMarkerCount: row.expectedMarkerCount,
      expectedMarkerText,
      expectedGraphToolPreview,
    };
  });
  if (names.size !== requiredNames.length || requiredNames.some((name) => !names.has(name))) throw new Error("sticky compatibility fixture required names must exactly match cases");
  return { cases, loaderMutations, source };
}

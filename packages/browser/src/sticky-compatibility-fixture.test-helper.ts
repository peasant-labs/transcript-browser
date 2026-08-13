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

export type StickyCompatibilityCase = { name: string; session: SessionDetailPayload; turnsMode?: "replace" | "visible"; suppliedTurns?: TurnDetail[] };
export type StickyCompatibilityFixture = {
  cases: StickyCompatibilityCase[];
  loaderMutations: Array<{ name: string; find: string; replace: string; expectedError: string }>;
  source: string;
};

const casesPath = resolve(process.cwd(), "src/testdata/sticky-compatibility.yaml");
const manifestPath = resolve(process.cwd(), "src/testdata/sticky-compatibility.manifest.yaml");

function parseTurns(raw: unknown, path: string): TurnDetail[] {
  if (!Array.isArray(raw)) throw new Error(`${path} must be an array`);
  return raw.map((value, index) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${path}[${index}] must be an object`);
    const record = value as Record<string, unknown>;
    const fields = Object.hasOwn(record, "observedModel")
      ? ["index", "role", "content", "timestamp", "depth", "observedModel"]
      : ["index", "role", "content", "timestamp", "depth"];
    requireExactFields(record, fields, `${path}[${index}]`);
    requireSafeNonnegativeInteger(record.index, `${path}[${index}].index`);
    requireNonEmptyString(record.role, `${path}[${index}].role`);
    if (record.role !== "assistant" && record.role !== "user") throw new Error(`${path}[${index}].role must be assistant or user`);
    requireNonEmptyString(record.content, `${path}[${index}].content`);
    requireNonEmptyString(record.timestamp, `${path}[${index}].timestamp`);
    if (!Number.isFinite(Date.parse(record.timestamp))) throw new Error(`${path}[${index}].timestamp must be RFC3339-compatible`);
    requireSafeNonnegativeInteger(record.depth, `${path}[${index}].depth`);
    if (Object.hasOwn(record, "observedModel")) requireNonEmptyString(record.observedModel, `${path}[${index}].observedModel`);
    return record as unknown as TurnDetail;
  });
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
  if (!Array.isArray(manifest.loaderMutations)) throw new Error("sticky compatibility manifest.loaderMutations must be an array");
  const loaderMutations = manifest.loaderMutations.map((value, index) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`sticky compatibility manifest.loaderMutations[${index}] must be an object`);
    const mutation = value as Record<string, unknown>;
    requireExactFields(mutation, ["name", "find", "replace", "expectedError"], `sticky compatibility manifest.loaderMutations[${index}]`);
    for (const field of ["name", "find", "replace", "expectedError"] as const) requireNonEmptyString(mutation[field], `sticky compatibility manifest.loaderMutations[${index}].${field}`);
    requireSingleOccurrence(mutationAnchorSource, mutation.find as string, `sticky compatibility manifest.loaderMutations[${index}]`);
    return mutation as { name: string; find: string; replace: string; expectedError: string };
  });
  if (loaderMutations.length !== manifest.expectedLoaderMutationCount) throw new Error("sticky compatibility manifest mutation count does not match its declaration");
  if (new Set(loaderMutations.map(({ name }) => name)).size !== loaderMutations.length) throw new Error("sticky compatibility manifest mutation names must be unique");

  const root = parseStrictYamlObject(source, "sticky compatibility fixture");
  requireExactFields(root, ["expectedCaseCount", "cases"], "sticky compatibility fixture");
  requireSafeNonnegativeInteger(root.expectedCaseCount, "sticky compatibility fixture.expectedCaseCount");
  if (!Array.isArray(root.cases) || root.cases.length !== root.expectedCaseCount || root.expectedCaseCount !== manifest.expectedCaseCount) throw new Error("sticky compatibility fixture counts must match root and manifest");
  const names = new Set<string>();
  const cases = root.cases.map((value, index) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`sticky compatibility fixture cases[${index}] must be an object`);
    const row = value as Record<string, unknown>;
    requireExactFields(row, ["name", "sessionModel", "turns", "turnsMode", "suppliedIndices", "suppliedContents"], `sticky compatibility fixture cases[${index}]`);
    requireNonEmptyString(row.name, `sticky compatibility fixture cases[${index}].name`);
    if (names.has(row.name)) throw new Error(`sticky compatibility fixture case name ${row.name} is duplicate`);
    names.add(row.name);
    requireNonEmptyString(row.sessionModel, `sticky compatibility fixture ${row.name}.sessionModel`);
    const turns = parseTurns(row.turns, `sticky compatibility fixture ${row.name}.turns`);
    if (row.turnsMode !== undefined && row.turnsMode !== "replace" && row.turnsMode !== "visible") throw new Error(`sticky compatibility fixture ${row.name}.turnsMode must be replace or visible`);
    if (!Array.isArray(row.suppliedIndices) || row.suppliedIndices.some((value) => typeof value !== "number" || !Number.isSafeInteger(value))) throw new Error(`sticky compatibility fixture ${row.name}.suppliedIndices must be integer array`);
    if (!Array.isArray(row.suppliedContents) || row.suppliedContents.some((value) => typeof value !== "string")) throw new Error(`sticky compatibility fixture ${row.name}.suppliedContents must be string array`);
    if (row.suppliedIndices.length !== row.suppliedContents.length) throw new Error(`sticky compatibility fixture ${row.name} supplied turn arrays must have equal lengths`);
    const indices = turns.map(({ index: turnIndex }) => turnIndex);
    if (new Set(indices).size !== indices.length) throw new Error(`sticky compatibility fixture ${row.name}.turn indices must be unique`);
    const session: SessionDetailPayload = {
      id: `sticky-compatibility-${index}`, harness: "claude-code", model: row.sessionModel as string,
      startTime: "2026-08-13T00:00:00Z", endTime: "2026-08-13T00:03:00Z", durationMins: 3,
      totalTokens: 0, tokensIn: 0, tokensOut: 0, turnCount: turns.length, toolCallCount: 0,
      workingDirectory: `/work/sticky-compatibility-${index}`, gitBranch: "main", gitRemote: "https://example.test/sticky-compatibility.git", scorecard: null, turns,
    };
    const suppliedContents = row.suppliedContents as string[];
    const suppliedIndices = row.suppliedIndices as number[];
    const suppliedTurns = suppliedIndices.map((suppliedIndex, suppliedPosition) => {
      const source = turns.find((turn) => turn.index === suppliedIndex);
      if (!source) throw new Error(`sticky compatibility fixture ${row.name} supplied index ${suppliedIndex} is not canonical`);
      return { ...source, content: suppliedContents[suppliedPosition]! };
    });
    return { name: row.name, session, turnsMode: row.turnsMode as "replace" | "visible" | undefined, suppliedTurns };
  });
  if (names.size !== requiredNames.length || requiredNames.some((name) => !names.has(name))) throw new Error("sticky compatibility fixture required names must exactly match cases");
  return { cases, loaderMutations, source };
}

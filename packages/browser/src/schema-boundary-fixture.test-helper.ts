import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  isHarness,
  isRole,
  isStopReason,
  type SessionDetailPayload,
  type StopReason,
  type TurnDetail,
} from "@peasant-labs/schema";
import {
  parseStrictYamlObject,
  requireExactFields,
  requireNonEmptyString,
  requireSafeNonnegativeInteger,
  requireSingleOccurrence,
  requireUniqueStringSet,
} from "./strict-yaml-fixture.test-helper.js";

export type SchemaBoundaryCase = {
  name: string;
  session: SessionDetailPayload;
  explicitTurns?: TurnDetail[];
  expectedIndices: number[];
  expectedDepths: number[];
  expectedStopReasons: StopReason[];
};

export type SchemaBoundaryLoaderMutation = {
  name: string;
  find: string;
  replace: string;
  expectedError: string;
};

export type SchemaBoundaryFixture = {
  cases: SchemaBoundaryCase[];
  depthCaseNames: string[];
  stopReasonCaseNames: string[];
  loaderMutations: SchemaBoundaryLoaderMutation[];
  source: string;
};

const behaviorPath = resolve(process.cwd(), "src/testdata/schema-boundary.behavior.yaml");
const manifestPath = resolve(process.cwd(), "src/testdata/schema-boundary.manifest.yaml");

function turns(value: unknown, path: string): TurnDetail[] {
  if (!Array.isArray(value)) throw new Error(`schema behavior fixture ${path} must be an array`);
  return value.map((raw, index) => {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error(`schema behavior fixture ${path}[${index}] must be an object`);
    const turn = raw as Record<string, unknown>;
    requireExactFields(turn, ["index", "role", "content", "timestamp", "depth", "stopReason"], `schema behavior fixture ${path}[${index}]`);
    requireSafeNonnegativeInteger(turn.index, `schema behavior fixture ${path}[${index}].index`);
    requireSafeNonnegativeInteger(turn.depth, `schema behavior fixture ${path}[${index}].depth`);
    requireNonEmptyString(turn.content, `schema behavior fixture ${path}[${index}].content`);
    requireNonEmptyString(turn.timestamp, `schema behavior fixture ${path}[${index}].timestamp`);
    if (!Number.isFinite(Date.parse(turn.timestamp))) throw new Error(`schema behavior fixture ${path}[${index}].timestamp must be RFC3339-compatible`);
    if (!isRole(turn.role)) throw new Error(`schema behavior fixture ${path}[${index}].role must be canonical`);
    if (!isStopReason(turn.stopReason)) throw new Error(`schema behavior fixture ${path}[${index}].stopReason must be canonical`);
    return turn as unknown as TurnDetail;
  });
}

function integerArray(value: unknown, path: string): number[] {
  if (!Array.isArray(value)) throw new Error(`schema behavior fixture ${path} must be an array`);
  value.forEach((entry, index) => requireSafeNonnegativeInteger(entry, `schema behavior fixture ${path}[${index}]`));
  return value as number[];
}

function sameSet(actual: readonly string[], expected: readonly string[], label: string): void {
  if (actual.length !== expected.length || actual.some((value) => !expected.includes(value)) || expected.some((value) => !actual.includes(value))) {
    throw new Error(`schema behavior fixture ${label} must exactly match its independent manifest set`);
  }
}

export function loadSchemaBoundaryFixture(
  source = readFileSync(behaviorPath, "utf8"),
  manifestSource = readFileSync(manifestPath, "utf8"),
  mutationAnchorSource = readFileSync(behaviorPath, "utf8"),
): SchemaBoundaryFixture {
  const manifest = parseStrictYamlObject(manifestSource, "schema behavior manifest");
  requireExactFields(manifest, ["expectedBehaviorCaseCount", "requiredBehaviorNames", "requiredHarnesses", "requiredStopReasons", "nullableTurnCaseNames", "explicitPrecedenceCaseNames", "depthCaseNames", "stopReasonCaseNames", "expectedBehaviorLoaderMutationCount", "behaviorLoaderMutations", "expectedBehaviorTestCount", "requiredBehaviorTestNames", "expectedMutationCount", "mutations", "expectedReporterControlCount", "reporterControls"], "schema behavior fixture manifest");
  for (const field of ["expectedBehaviorCaseCount", "expectedBehaviorLoaderMutationCount", "expectedBehaviorTestCount", "expectedMutationCount", "expectedReporterControlCount"] as const) requireSafeNonnegativeInteger(manifest[field], `schema behavior fixture manifest.${field}`);
  const requiredNames = requireUniqueStringSet(manifest.requiredBehaviorNames, "schema behavior fixture manifest.requiredBehaviorNames");
  const requiredHarnesses = requireUniqueStringSet(manifest.requiredHarnesses, "schema behavior fixture manifest.requiredHarnesses");
  const requiredStopReasons = requireUniqueStringSet(manifest.requiredStopReasons, "schema behavior fixture manifest.requiredStopReasons");
  const nullableNames = requireUniqueStringSet(manifest.nullableTurnCaseNames, "schema behavior fixture manifest.nullableTurnCaseNames");
  const precedenceNames = requireUniqueStringSet(manifest.explicitPrecedenceCaseNames, "schema behavior fixture manifest.explicitPrecedenceCaseNames");
  const depthCaseNames = requireUniqueStringSet(manifest.depthCaseNames, "schema behavior fixture manifest.depthCaseNames");
  const stopReasonCaseNames = requireUniqueStringSet(manifest.stopReasonCaseNames, "schema behavior fixture manifest.stopReasonCaseNames");
  const requiredTestNames = requireUniqueStringSet(manifest.requiredBehaviorTestNames, "schema behavior fixture manifest.requiredBehaviorTestNames");
  if (requiredNames.length !== manifest.expectedBehaviorCaseCount || requiredTestNames.length !== manifest.expectedBehaviorTestCount) throw new Error("schema behavior manifest case and test counts must match their independent names");
  if (requiredHarnesses.some((harness) => !isHarness(harness))) throw new Error("schema behavior manifest requiredHarnesses must all be canonical");
  if (requiredStopReasons.some((reason) => !isStopReason(reason))) throw new Error("schema behavior manifest requiredStopReasons must all be canonical");
  if ([...nullableNames, ...precedenceNames, ...depthCaseNames, ...stopReasonCaseNames].some((name) => !requiredNames.includes(name))) throw new Error("schema behavior manifest relation case names must be required behavior cases");

  if (!Array.isArray(manifest.behaviorLoaderMutations)) throw new Error("schema behavior manifest behaviorLoaderMutations must be an array");
  const loaderFields = ["name", "find", "replace", "expectedError"] as const;
  const loaderMutations = manifest.behaviorLoaderMutations.map((raw, index) => {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error(`schema behavior manifest behaviorLoaderMutations[${index}] must be an object`);
    const row = raw as Record<string, unknown>;
    requireExactFields(row, loaderFields, `schema behavior fixture manifest.behaviorLoaderMutations[${index}]`);
    for (const field of loaderFields) requireNonEmptyString(row[field], `schema behavior fixture manifest.behaviorLoaderMutations[${index}].${field}`);
    requireSingleOccurrence(mutationAnchorSource, row.find as string, `schema behavior manifest behaviorLoaderMutations[${index}]`);
    return row as unknown as SchemaBoundaryLoaderMutation;
  });
  if (loaderMutations.length !== manifest.expectedBehaviorLoaderMutationCount || new Set(loaderMutations.map(({ name }) => name)).size !== loaderMutations.length) {
    throw new Error("schema behavior manifest loader mutations must have exact count and unique names");
  }

  const root = parseStrictYamlObject(source, "schema behavior fixture");
  requireExactFields(root, ["cases"], "schema behavior fixture root");
  if (!Array.isArray(root.cases) || root.cases.length !== manifest.expectedBehaviorCaseCount) throw new Error("schema behavior fixture case count does not match its independent manifest");
  const cases = root.cases.map((raw, index) => {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error(`schema behavior fixture cases[${index}] must be an object`);
    const row = raw as Record<string, unknown>;
    requireExactFields(row, ["name", "harness", "gitBranch", "gitRemote", "turns", "useExplicitTurns", "explicitTurns", "expectedIndices", "expectedDepths", "expectedStopReasons"], `schema behavior fixture cases[${index}]`);
    requireNonEmptyString(row.name, `schema behavior fixture cases[${index}].name`);
    requireNonEmptyString(row.gitBranch, `schema behavior fixture cases[${index}].gitBranch`);
    requireNonEmptyString(row.gitRemote, `schema behavior fixture cases[${index}].gitRemote`);
    const harness = row.harness;
    if (!isHarness(harness)) throw new Error(`schema behavior fixture cases[${index}].harness must be canonical`);
    if (typeof row.useExplicitTurns !== "boolean") throw new Error(`schema behavior fixture cases[${index}].useExplicitTurns must be boolean`);
    const canonicalTurns = row.turns === null ? null : turns(row.turns, `cases[${index}].turns`);
    const explicit = turns(row.explicitTurns, `cases[${index}].explicitTurns`);
    if (!row.useExplicitTurns && explicit.length) throw new Error(`schema behavior fixture cases[${index}] cannot define unused explicit turns`);
    const expectedIndices = integerArray(row.expectedIndices, `cases[${index}].expectedIndices`);
    const expectedDepths = integerArray(row.expectedDepths, `cases[${index}].expectedDepths`);
    if (!Array.isArray(row.expectedStopReasons) || row.expectedStopReasons.some((reason) => !isStopReason(reason))) throw new Error(`schema behavior fixture cases[${index}].expectedStopReasons must be canonical`);
    const selected = row.useExplicitTurns ? explicit : (canonicalTurns ?? []);
    if (JSON.stringify(expectedIndices) !== JSON.stringify(selected.map((turn) => turn.index)) || JSON.stringify(expectedDepths) !== JSON.stringify(selected.map((turn) => turn.depth)) || JSON.stringify(row.expectedStopReasons) !== JSON.stringify(selected.map((turn) => turn.stopReason))) {
      throw new Error(`schema behavior fixture cases[${index}] expectations must match the selected wire turns`);
    }
    const session: SessionDetailPayload = {
      id: `schema-boundary-${index}`,
      harness,
      startTime: "2026-07-15T08:00:00Z",
      endTime: "2026-07-15T08:10:00Z",
      durationMins: 10,
      totalTokens: 10,
      tokensIn: 4,
      tokensOut: 6,
      turnCount: canonicalTurns?.length ?? 0,
      toolCallCount: 0,
      workingDirectory: `/work/schema-boundary-${index}`,
      gitBranch: row.gitBranch,
      gitRemote: row.gitRemote,
      scorecard: null,
      turns: canonicalTurns,
    };
    return {
      name: row.name,
      session,
      explicitTurns: row.useExplicitTurns ? explicit : undefined,
      expectedIndices,
      expectedDepths,
      expectedStopReasons: row.expectedStopReasons as StopReason[],
    };
  });
  const names = cases.map(({ name }) => name);
  const harnesses = cases.map(({ session }) => session.harness);
  const stopReasons = [...new Set(cases.flatMap(({ session, explicitTurns }) => [...(session.turns ?? []), ...(explicitTurns ?? [])].map((turn) => turn.stopReason).filter(isStopReason)))];
  const actualNullableNames = cases.filter(({ session }) => session.turns === null).map(({ name }) => name);
  const actualPrecedenceNames = cases.filter(({ explicitTurns }) => explicitTurns !== undefined).map(({ name }) => name);
  sameSet(names, requiredNames, "behavior case names");
  sameSet(harnesses, requiredHarnesses, "Harness coverage");
  sameSet(stopReasons, requiredStopReasons, "StopReason coverage");
  sameSet(actualNullableNames, nullableNames, "nullable turn cases");
  sameSet(actualPrecedenceNames, precedenceNames, "explicit precedence cases");
  if (depthCaseNames.some((name) => nullableNames.includes(name) || precedenceNames.includes(name))) throw new Error("schema behavior manifest depth cases must isolate canonical non-null turns");
  const stopCaseReasons = [...new Set(cases.filter(({ name }) => stopReasonCaseNames.includes(name)).flatMap(({ session, explicitTurns }) => (explicitTurns ?? session.turns ?? []).map((turn) => turn.stopReason).filter(isStopReason)))];
  sameSet(stopCaseReasons, requiredStopReasons, "StopReason behavior case coverage");
  for (const name of precedenceNames) {
    const fixtureCase = cases.find((entry) => entry.name === name)!;
    if (!fixtureCase.session.turns?.length || !fixtureCase.explicitTurns?.length || JSON.stringify(fixtureCase.session.turns.map(({ index }) => index)) === JSON.stringify(fixtureCase.expectedIndices)) {
      throw new Error(`schema behavior fixture ${name} must exercise distinct canonical and explicit turn precedence`);
    }
  }
  return { cases, depthCaseNames, stopReasonCaseNames, loaderMutations, source };
}

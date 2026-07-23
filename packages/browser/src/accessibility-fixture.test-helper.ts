import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  isHarness,
  isRole,
  isStopReason,
  type SessionDetailPayload,
} from "@peasant-labs/schema";
import {
  parseStrictYamlObject,
  requireExactFields,
  requireFiniteNonnegativeNumber,
  requireNonEmptyString,
  requireSafeNonnegativeInteger,
  requireSingleOccurrence,
  requireUniqueStringSet,
} from "./strict-yaml-fixture.test-helper.js";

export type AccessibilityCase = {
  name: string;
  session: SessionDetailPayload;
  checkbox: {
    label: string;
    count: number;
    initialChecked: boolean;
    expectedAfterClick: boolean;
  };
  expected: { mainLandmarks: number; tabPanelLabel: string };
};

export type LoaderMutation = {
  category: "required" | "structural";
  path: string;
  name: string;
  find: string;
  replace: string;
  expectedError: string;
};

export type AccessibilityFixture = {
  cases: AccessibilityCase[];
  loaderMutations: LoaderMutation[];
  source: string;
};

const manifestPath = resolve(process.cwd(), "src/testdata/accessibility.manifest.yaml");
const casesPath = resolve(process.cwd(), "src/testdata/accessibility.yaml");

function finiteNumber(value: unknown, path: string, integer = false): asserts value is number {
  if (integer) requireSafeNonnegativeInteger(value, `accessibility fixture ${path}`);
  else requireFiniteNonnegativeNumber(value, `accessibility fixture ${path}`);
}

function validateTurn(raw: unknown, path: string): void {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error(`accessibility fixture ${path} must be an object`);
  const turn = raw as Record<string, unknown>;
  requireExactFields(turn, ["index", "role", "content", "timestamp", "depth", "stopReason"], `accessibility fixture ${path}`);
  finiteNumber(turn.index, `${path}.index`, true);
  finiteNumber(turn.depth, `${path}.depth`, true);
  requireNonEmptyString(turn.content, `accessibility fixture ${path}.content`);
  requireNonEmptyString(turn.timestamp, `accessibility fixture ${path}.timestamp`);
  if (!Number.isFinite(Date.parse(turn.timestamp))) throw new Error(`accessibility fixture ${path}.timestamp must be RFC3339-compatible`);
  if (!isRole(turn.role)) throw new Error(`accessibility fixture ${path}.role must be canonical`);
  if (!isStopReason(turn.stopReason)) throw new Error(`accessibility fixture ${path}.stopReason must be canonical`);
}

function validateSession(raw: unknown, path: string): asserts raw is SessionDetailPayload {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error(`accessibility fixture ${path} must be an object`);
  const session = raw as Record<string, unknown>;
  requireExactFields(session, ["id", "harness", "startTime", "endTime", "durationMins", "totalTokens", "tokensIn", "tokensOut", "turnCount", "toolCallCount", "workingDirectory", "gitBranch", "gitRemote", "scorecard", "turns"], `accessibility fixture ${path}`);
  for (const field of ["id", "startTime", "endTime", "workingDirectory", "gitBranch", "gitRemote"] as const) requireNonEmptyString(session[field], `accessibility fixture ${path}.${field}`);
  if (!Number.isFinite(Date.parse(session.startTime as string)) || !Number.isFinite(Date.parse(session.endTime as string))) {
    throw new Error(`accessibility fixture ${path} timestamps must be RFC3339-compatible`);
  }
  for (const field of ["durationMins", "totalTokens", "tokensIn", "tokensOut"] as const) finiteNumber(session[field], `${path}.${field}`);
  for (const field of ["turnCount", "toolCallCount"] as const) finiteNumber(session[field], `${path}.${field}`, true);
  if (!isHarness(session.harness)) throw new Error(`accessibility fixture ${path}.harness must be canonical`);
  if (session.scorecard !== null) throw new Error(`accessibility fixture ${path}.scorecard must be null`);
  if (session.turns !== null && !Array.isArray(session.turns)) throw new Error(`accessibility fixture ${path}.turns must be an array or null`);
  const turns = session.turns ?? [];
  if (turns.length !== session.turnCount) throw new Error(`accessibility fixture ${path}.turnCount must equal the canonical turn inventory`);
  if ((session.turns === null) !== (session.turnCount === 0)) throw new Error(`accessibility fixture ${path}.null turns must represent an empty session`);
  const indices = new Set<number>();
  turns.forEach((turn, index) => {
    validateTurn(turn, `${path}.turns[${index}]`);
    const wireIndex = (turn as { index: number }).index;
    if (indices.has(wireIndex)) throw new Error(`accessibility fixture ${path}.turn indices must be unique`);
    indices.add(wireIndex);
  });
}

export function loadAccessibilityFixture(
  casesSource = readFileSync(casesPath, "utf8"),
  manifestSource = readFileSync(manifestPath, "utf8"),
  mutationAnchorSource = readFileSync(casesPath, "utf8"),
): AccessibilityFixture {
  const manifest = parseStrictYamlObject(manifestSource, "accessibility manifest");
  requireExactFields(manifest, ["expectedCaseCount", "requiredCaseNames", "expectedRequiredFieldMutationCount", "requiredFieldPaths", "expectedStructuralMutationCount", "expectedLoaderMutationCount", "loaderMutations"], "accessibility fixture manifest");
  finiteNumber(manifest.expectedCaseCount, "manifest.expectedCaseCount", true);
  finiteNumber(manifest.expectedRequiredFieldMutationCount, "manifest.expectedRequiredFieldMutationCount", true);
  finiteNumber(manifest.expectedStructuralMutationCount, "manifest.expectedStructuralMutationCount", true);
  finiteNumber(manifest.expectedLoaderMutationCount, "manifest.expectedLoaderMutationCount", true);
  if (!Array.isArray(manifest.loaderMutations)) throw new Error("accessibility manifest requires loader mutations");
  const requiredNames = requireUniqueStringSet(manifest.requiredCaseNames, "accessibility fixture manifest.requiredCaseNames");
  if (requiredNames.length !== manifest.expectedCaseCount) throw new Error("accessibility manifest case names must match expectedCaseCount");
  const requiredFieldPaths = requireUniqueStringSet(manifest.requiredFieldPaths, "accessibility fixture manifest.requiredFieldPaths");
  if (requiredFieldPaths.length !== manifest.expectedRequiredFieldMutationCount) throw new Error("accessibility manifest required field paths must match expectedRequiredFieldMutationCount");

  const mutationFields = ["category", "path", "name", "find", "replace", "expectedError"] as const;
  const loaderMutations = manifest.loaderMutations.map((raw, index) => {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error(`accessibility manifest loaderMutations[${index}] must be an object`);
    const mutation = raw as Record<string, unknown>;
    requireExactFields(mutation, mutationFields, `accessibility fixture manifest.loaderMutations[${index}]`);
    for (const field of ["category", "path", "name", "find", "expectedError"] as const) {
      requireNonEmptyString(mutation[field], `accessibility fixture manifest.loaderMutations[${index}].${field}`);
    }
    if (typeof mutation.replace !== "string") throw new Error(`accessibility manifest loaderMutations[${index}].replace must be a string`);
    if (mutation.category !== "required" && mutation.category !== "structural") throw new Error(`accessibility manifest loaderMutations[${index}].category must be required or structural`);
    const mutationPath = mutation.path as string;
    if (mutation.category === "required") {
      if (!requiredFieldPaths.includes(mutationPath)) throw new Error(`accessibility manifest loaderMutations[${index}].path is not a declared required field`);
      const field = mutationPath.split(".").at(-1);
      if (mutation.expectedError !== `missing=${field}`) throw new Error(`accessibility manifest loaderMutations[${index}] must name its missing field error`);
    } else if (!mutationPath.startsWith("structural.")) {
      throw new Error(`accessibility manifest loaderMutations[${index}].path must identify a structural invariant`);
    }
    requireSingleOccurrence(mutationAnchorSource, mutation.find as string, `accessibility manifest loaderMutations[${index}]`);
    return mutation as unknown as LoaderMutation;
  });
  const requiredMutations = loaderMutations.filter(({ category }) => category === "required");
  const structuralMutations = loaderMutations.filter(({ category }) => category === "structural");
  const mutationPaths = loaderMutations.map(({ path }) => path);
  if (
    loaderMutations.length !== manifest.expectedLoaderMutationCount ||
    manifest.expectedLoaderMutationCount !== manifest.expectedRequiredFieldMutationCount + manifest.expectedStructuralMutationCount ||
    requiredMutations.length !== manifest.expectedRequiredFieldMutationCount ||
    structuralMutations.length !== manifest.expectedStructuralMutationCount ||
    new Set(loaderMutations.map(({ name }) => name)).size !== loaderMutations.length ||
    new Set(mutationPaths).size !== mutationPaths.length ||
    requiredFieldPaths.some((path) => !requiredMutations.some((mutation) => mutation.path === path))
  ) {
    throw new Error("accessibility manifest loader mutations must exactly cover required fields, structural rows, counts, names, and paths");
  }

  const root = parseStrictYamlObject(casesSource, "accessibility fixture");
  requireExactFields(root, ["expectedCaseCount", "cases"], "accessibility fixture root");
  finiteNumber(root.expectedCaseCount, "root.expectedCaseCount", true);
  if (!Array.isArray(root.cases) || root.cases.length !== root.expectedCaseCount || root.expectedCaseCount !== manifest.expectedCaseCount) {
    throw new Error("accessibility fixture case inventory must match both declared counts");
  }

  const names = new Set<string>();
  const cases = root.cases.map((raw, index) => {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error(`accessibility fixture cases[${index}] must be an object`);
    const fixtureCase = raw as Record<string, unknown>;
    requireExactFields(fixtureCase, ["name", "session", "checkbox", "expected"], `accessibility fixture cases[${index}]`);
    requireNonEmptyString(fixtureCase.name, `accessibility fixture cases[${index}].name`);
    if (names.has(fixtureCase.name)) throw new Error(`accessibility fixture case name ${fixtureCase.name} is duplicated`);
    names.add(fixtureCase.name);
    validateSession(fixtureCase.session, `${fixtureCase.name}.session`);

    if (!fixtureCase.checkbox || typeof fixtureCase.checkbox !== "object" || Array.isArray(fixtureCase.checkbox)) throw new Error(`accessibility fixture ${fixtureCase.name}.checkbox must be an object`);
    const checkbox = fixtureCase.checkbox as Record<string, unknown>;
    requireExactFields(checkbox, ["label", "count", "initialChecked", "expectedAfterClick"], `accessibility fixture ${fixtureCase.name}.checkbox`);
    requireNonEmptyString(checkbox.label, `accessibility fixture ${fixtureCase.name}.checkbox.label`);
    finiteNumber(checkbox.count, `${fixtureCase.name}.checkbox.count`, true);
    if (typeof checkbox.initialChecked !== "boolean" || typeof checkbox.expectedAfterClick !== "boolean" || checkbox.initialChecked === checkbox.expectedAfterClick) {
      throw new Error(`accessibility fixture ${fixtureCase.name}.checkbox must define a non-vacuous boolean transition`);
    }

    if (!fixtureCase.expected || typeof fixtureCase.expected !== "object" || Array.isArray(fixtureCase.expected)) throw new Error(`accessibility fixture ${fixtureCase.name}.expected must be an object`);
    const expected = fixtureCase.expected as Record<string, unknown>;
    requireExactFields(expected, ["mainLandmarks", "tabPanelLabel"], `accessibility fixture ${fixtureCase.name}.expected`);
    finiteNumber(expected.mainLandmarks, `${fixtureCase.name}.expected.mainLandmarks`, true);
    requireNonEmptyString(expected.tabPanelLabel, `accessibility fixture ${fixtureCase.name}.expected.tabPanelLabel`);
    return fixtureCase as unknown as AccessibilityCase;
  });
  if (names.size !== requiredNames.length || requiredNames.some((name) => !names.has(name as string))) throw new Error("accessibility fixture is missing a required semantic case name");
  return { cases, loaderMutations, source: casesSource };
}

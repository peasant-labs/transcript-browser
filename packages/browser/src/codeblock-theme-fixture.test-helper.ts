import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  parseStrictYamlObject,
  requireExactFields,
  requireNonEmptyString,
  requireSafeNonnegativeInteger,
  requireSingleOccurrence,
  requireUniqueStringSet,
} from "./strict-yaml-fixture.test-helper.js";

export type CodeBlockThemeCase = {
  name: string;
  theme: "light" | "dark";
  expectedLight: string;
  expectedDark: string;
};

export type CodeBlockThemeFixture = {
  cases: CodeBlockThemeCase[];
  loaderMutations: Array<{ name: string; find: string; replace: string; expectedError: string }>;
  source: string;
};

const casesPath = resolve(process.cwd(), "src/testdata/codeblock-themes.yaml");
const manifestPath = resolve(process.cwd(), "src/testdata/codeblock-themes.manifest.yaml");

export function loadCodeBlockThemeFixture(
  source = readFileSync(casesPath, "utf8"),
  manifestSource = readFileSync(manifestPath, "utf8"),
  mutationAnchorSource = readFileSync(casesPath, "utf8"),
): CodeBlockThemeFixture {
  const manifest = parseStrictYamlObject(manifestSource, "code block theme manifest");
  requireExactFields(manifest, ["expectedCaseCount", "requiredCaseNames", "expectedLoaderMutationCount", "loaderMutations"], "code block theme manifest");
  requireSafeNonnegativeInteger(manifest.expectedCaseCount, "code block theme manifest.expectedCaseCount");
  requireSafeNonnegativeInteger(manifest.expectedLoaderMutationCount, "code block theme manifest.expectedLoaderMutationCount");
  const requiredNames = requireUniqueStringSet(manifest.requiredCaseNames, "code block theme manifest.requiredCaseNames");
  if (requiredNames.length !== manifest.expectedCaseCount) throw new Error("code block theme manifest names must match expectedCaseCount");
  if (!Array.isArray(manifest.loaderMutations)) throw new Error("code block theme manifest.loaderMutations must be an array");
  const loaderMutations = manifest.loaderMutations.map((raw, index) => {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error(`code block theme loader mutation ${index} must be an object`);
    const row = raw as Record<string, unknown>;
    requireExactFields(row, ["name", "find", "replace", "expectedError"], `code block theme loader mutation ${index}`);
    for (const field of ["name", "find", "replace", "expectedError"] as const) requireNonEmptyString(row[field], `code block theme loader mutation ${index}.${field}`);
    requireSingleOccurrence(mutationAnchorSource, row.find as string, `code block theme loader mutation ${index}`);
    return row as { name: string; find: string; replace: string; expectedError: string };
  });
  if (loaderMutations.length !== manifest.expectedLoaderMutationCount || new Set(loaderMutations.map(({ name }) => name)).size !== loaderMutations.length) throw new Error("code block theme loader mutations must have exact count and unique names");

  const root = parseStrictYamlObject(source, "code block theme fixture");
  requireExactFields(root, ["expectedCaseCount", "cases"], "code block theme fixture");
  requireSafeNonnegativeInteger(root.expectedCaseCount, "code block theme fixture.expectedCaseCount");
  if (!Array.isArray(root.cases) || root.cases.length !== root.expectedCaseCount || root.expectedCaseCount !== manifest.expectedCaseCount) throw new Error("code block theme fixture counts must match root and manifest");
  const names = new Set<string>();
  const cases = root.cases.map((raw, index) => {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error(`code block theme case ${index} must be an object`);
    const row = raw as Record<string, unknown>;
    requireExactFields(row, ["name", "theme", "expectedLight", "expectedDark"], `code block theme case ${index}`);
    requireNonEmptyString(row.name, `code block theme case ${index}.name`);
    requireNonEmptyString(row.expectedLight, `code block theme case ${index}.expectedLight`);
    requireNonEmptyString(row.expectedDark, `code block theme case ${index}.expectedDark`);
    if (row.theme !== "light" && row.theme !== "dark") throw new Error(`code block theme case ${index}.theme must be light or dark`);
    if (names.has(row.name)) throw new Error(`code block theme case ${index}.name must be unique; duplicate names are not allowed`);
    names.add(row.name);
    return row as unknown as CodeBlockThemeCase;
  });
  if (names.size !== requiredNames.length || requiredNames.some((name) => !names.has(name))) throw new Error("code block theme fixture required names must exactly match cases");
  return { cases, loaderMutations, source };
}

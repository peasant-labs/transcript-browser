import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  parseStrictYamlObject,
  requireExactFields,
  requireFiniteNonnegativeNumber,
  requireNonEmptyString,
  requireSafeNonnegativeInteger,
  requireSingleOccurrence,
  requireUniqueStringSet,
} from "./strict-yaml-fixture.test-helper.js";

type PrimitiveOperation =
  | "parse"
  | "exact-fields"
  | "nonempty-string"
  | "safe-nonnegative-integer"
  | "finite-nonnegative-number"
  | "unique-string-set"
  | "single-occurrence";

type PrimitiveCase = {
  name: string;
  operation: PrimitiveOperation;
  source: string;
  stimulus: string;
  value: unknown;
  fields: string[];
  expectedError: string;
};

const source = readFileSync(resolve(process.cwd(), "src/testdata/strict-yaml-primitives.yaml"), "utf8");
const root = parseStrictYamlObject(source, "strict YAML primitive fixture");
requireExactFields(root, ["expectedCaseCount", "cases"], "strict YAML primitive fixture root");
requireSafeNonnegativeInteger(root.expectedCaseCount, "strict YAML primitive fixture expectedCaseCount");
if (!Array.isArray(root.cases) || root.cases.length !== root.expectedCaseCount) throw new Error("strict YAML primitive fixture cases must match expectedCaseCount");

const operations = new Set<PrimitiveOperation>([
  "parse",
  "exact-fields",
  "nonempty-string",
  "safe-nonnegative-integer",
  "finite-nonnegative-number",
  "unique-string-set",
  "single-occurrence",
]);
const cases = root.cases.map((raw, index) => {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error(`strict YAML primitive fixture cases[${index}] must be an object`);
  const row = raw as Record<string, unknown>;
  requireExactFields(row, ["name", "operation", "source", "stimulus", "value", "fields", "expectedError"], `strict YAML primitive fixture cases[${index}]`);
  requireNonEmptyString(row.name, `strict YAML primitive fixture cases[${index}].name`);
  requireNonEmptyString(row.operation, `strict YAML primitive fixture cases[${index}].operation`);
  requireNonEmptyString(row.source, `strict YAML primitive fixture cases[${index}].source`);
  requireNonEmptyString(row.stimulus, `strict YAML primitive fixture cases[${index}].stimulus`);
  requireNonEmptyString(row.expectedError, `strict YAML primitive fixture cases[${index}].expectedError`);
  if (!operations.has(row.operation as PrimitiveOperation)) throw new Error(`strict YAML primitive fixture cases[${index}].operation is unsupported`);
  if (!Array.isArray(row.fields) || row.fields.some((field) => typeof field !== "string")) throw new Error(`strict YAML primitive fixture cases[${index}].fields must be strings`);
  return row as unknown as PrimitiveCase;
});
requireUniqueStringSet(cases.map(({ name }) => name), "strict YAML primitive fixture names");

describe("strict YAML fixture primitives", () => {
  for (const fixture of cases) {
    it(fixture.name, () => {
      expect(() => execute(fixture)).toThrow(fixture.expectedError);
    });
  }
});

function execute(fixture: PrimitiveCase): void {
  switch (fixture.operation) {
    case "parse":
      parseStrictYamlObject(fixture.source, "primitive parse stimulus");
      return;
    case "exact-fields":
      requireExactFields(fixture.value as Record<string, unknown>, fixture.fields, "primitive exact-fields stimulus");
      return;
    case "nonempty-string":
      requireNonEmptyString(fixture.value, "primitive string stimulus");
      return;
    case "safe-nonnegative-integer":
      requireSafeNonnegativeInteger(fixture.value, "primitive integer stimulus");
      return;
    case "finite-nonnegative-number":
      requireFiniteNonnegativeNumber(fixture.value, "primitive number stimulus");
      return;
    case "unique-string-set":
      requireUniqueStringSet(fixture.value, "primitive set stimulus");
      return;
    case "single-occurrence":
      requireSingleOccurrence(fixture.source, fixture.stimulus, "primitive occurrence stimulus");
  }
}

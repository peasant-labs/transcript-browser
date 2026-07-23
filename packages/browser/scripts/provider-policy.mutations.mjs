import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { captureBaseline, exactFields, requireSingleOccurrence, verifyMutation } from "./lib/vitest-mutation-runner.mjs";
import YAML from "yaml";

const TEST_FILE = "src/provider-policy.test.ts";
const manifestPath = resolve("src/testdata/provider-policy.manifest.yaml");
const document = YAML.parseDocument(readFileSync(manifestPath, "utf8"), { strict: true, uniqueKeys: true });
if (document.errors.length) throw new Error(`provider mutation manifest is invalid: ${document.errors.map((error) => error.message).join("; ")}`);
const manifest = document.toJS();
exactFields(manifest, ["expectedHarnessCount", "expectedMountedCount", "requiredHarnesses", "absentTestName", "expectedMutationCount", "mutations"], "provider mutation manifest");
if (!Number.isSafeInteger(manifest.expectedMutationCount) || manifest.expectedMutationCount < 0 || !Array.isArray(manifest.mutations) || manifest.mutations.length !== manifest.expectedMutationCount) {
  throw new Error("provider mutation manifest count must match its exact mutation inventory");
}

const fields = ["name", "target", "find", "replace", "expectedTestName", "expectedFailurePattern"];
for (const [index, mutation] of manifest.mutations.entries()) {
  exactFields(mutation, fields, `provider mutation manifest mutations[${index}]`);
  for (const field of fields) if (typeof mutation[field] !== "string" || mutation[field].length === 0) throw new Error(`provider mutation manifest mutations[${index}].${field} must be a non-empty string`);
}
if (new Set(manifest.mutations.map(({ name }) => name)).size !== manifest.mutations.length) throw new Error("provider mutation names must be unique");

// TRANSCRIPT_BROWSER_MUTATION_JSON is read by vitest.config.ts's
// isolatedMutationPlugin, matched against `mutation.target` (TurnRow.tsx).
const baseline = captureBaseline(TEST_FILE, "baseline (unmutated TurnRow.tsx)");
for (const mutation of manifest.mutations) {
  requireSingleOccurrence(readFileSync(resolve(mutation.target), "utf8"), mutation.find, mutation.name);
  verifyMutation({
    testFile: TEST_FILE,
    mutation,
    envKey: "TRANSCRIPT_BROWSER_MUTATION_JSON",
    expectedFailedTitles: [mutation.expectedTestName],
    baseline,
  });
}

console.log(`provider policy mutations: ${manifest.mutations.length} isolated TurnRow boundary mutations were killed, each proven against the full ${baseline.assertions.length}-assertion baseline inventory`);

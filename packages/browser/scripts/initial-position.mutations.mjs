import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import YAML from "yaml";
import { captureBaseline, exactFields, requireSingleOccurrence, verifyMutation } from "./lib/vitest-mutation-runner.mjs";

const TEST_FILE = "src/initial-position.test.tsx";
const productionPath = resolve("src/SessionDetail.tsx");
const manifestPath = resolve("src/testdata/initial-position.manifest.yaml");
const production = readFileSync(productionPath, "utf8");
const document = YAML.parseDocument(readFileSync(manifestPath, "utf8"), { strict: true, uniqueKeys: true });
if (document.errors.length) throw new Error(`initial-position mutation manifest is invalid: ${document.errors.map((error) => error.message).join("; ")}`);
const manifest = document.toJS();
if (!manifest || typeof manifest !== "object" || Array.isArray(manifest) || !Array.isArray(manifest.mutations) || !Number.isSafeInteger(manifest.expectedMutationCount) || manifest.expectedMutationCount !== manifest.mutations.length) throw new Error("initial-position mutation manifest must contain its exact mutation inventory");

if (new Set(manifest.mutations.map((row) => row?.name)).size !== manifest.mutations.length) throw new Error("initial-position mutation names must be globally unique");
const mutationFields = ["name", "find", "replace", "expectedFailedTestNames", "expectedFailurePattern"];
for (const [index, mutation] of manifest.mutations.entries()) {
  exactFields(mutation, mutationFields, `mutation ${index}`);
  for (const field of ["name", "find", "replace", "expectedFailurePattern"]) {
    if (typeof mutation[field] !== "string" || mutation[field].length === 0) throw new Error(`mutation ${index} field ${field} must be a non-empty string`);
  }
  if (!Array.isArray(mutation.expectedFailedTestNames) || mutation.expectedFailedTestNames.length === 0 || mutation.expectedFailedTestNames.some((name) => typeof name !== "string" || name.length === 0)) {
    throw new Error(`mutation ${index} (${mutation.name}) expectedFailedTestNames must be a non-empty array of non-empty strings`);
  }
  if (new Set(mutation.expectedFailedTestNames).size !== mutation.expectedFailedTestNames.length) throw new Error(`mutation ${index} (${mutation.name}) expectedFailedTestNames must not repeat a test name`);
  if (/^(?:AssertionError|Expected)$/.test(mutation.expectedFailurePattern)) throw new Error(`${mutation.name}: expectedFailurePattern must identify the violated invariant`);
  requireSingleOccurrence(production, mutation.find, mutation.name);
}

// TRANSCRIPT_BROWSER_MUTATION_JSON is read by vitest.config.ts's
// isolatedMutationPlugin, always targeting SessionDetail.tsx.
const baseline = captureBaseline(TEST_FILE, "baseline (unmutated SessionDetail.tsx)");
for (const mutation of manifest.mutations) {
  verifyMutation({
    testFile: TEST_FILE,
    mutation,
    envKey: "TRANSCRIPT_BROWSER_MUTATION_JSON",
    expectedFailedTitles: mutation.expectedFailedTestNames,
    baseline,
  });
}

console.log(`initial-position mutations: ${manifest.mutations.length} isolated executable production mutations were killed without modifying tracked sources, each proven against the full ${baseline.assertions.length}-test baseline inventory`);

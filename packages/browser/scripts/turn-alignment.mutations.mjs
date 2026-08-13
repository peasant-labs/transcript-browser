import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import YAML from "yaml";
import { captureBaseline, exactFields, requireSingleOccurrence, verifyMutation } from "./lib/vitest-mutation-runner.mjs";

const manifestPath = resolve("src/testdata/turn-alignment.mutations.yaml");
const document = YAML.parseDocument(readFileSync(manifestPath, "utf8"), { strict: true, uniqueKeys: true });
if (document.errors.length) throw new Error(`turn alignment mutation manifest is invalid: ${document.errors.map((error) => error.message).join("; ")}`);
const manifest = document.toJS();
exactFields(manifest, ["expectedMutationCount", "mutations"], "turn alignment mutation manifest");
if (!Number.isSafeInteger(manifest.expectedMutationCount) || manifest.expectedMutationCount < 0 || !Array.isArray(manifest.mutations) || manifest.mutations.length !== manifest.expectedMutationCount) {
  throw new Error("turn alignment mutation manifest count must match its exact mutation inventory");
}
const fields = ["name", "target", "find", "replace", "expectedTestName", "expectedFailurePattern"];
for (const [index, mutation] of manifest.mutations.entries()) {
  exactFields(mutation, fields, `turn alignment mutation ${index}`);
  for (const field of fields) if (typeof mutation[field] !== "string" || mutation[field].length === 0) throw new Error(`turn alignment mutation ${index}.${field} must be a non-empty string`);
  requireSingleOccurrence(readFileSync(resolve(mutation.target), "utf8"), mutation.find, mutation.name);
}
if (new Set(manifest.mutations.map(({ name }) => name)).size !== manifest.mutations.length) throw new Error("turn alignment mutation names must be unique");

const tests = new Map([
  ["src/lib/turn-alignment.ts", "src/lib/turn-alignment.test.ts"],
  ["src/SessionDetail.tsx", "src/sticky-compatibility.test.tsx"],
]);
const baselines = new Map();
for (const testFile of new Set(tests.values())) baselines.set(testFile, captureBaseline(testFile, `${testFile} baseline`));

for (const mutation of manifest.mutations) {
  const testFile = tests.get(mutation.target);
  if (!testFile) throw new Error(`${mutation.name}: mutation target has no focused test suite`);
  verifyMutation({
    testFile,
    mutation,
    envKey: "TRANSCRIPT_BROWSER_MUTATION_JSON",
    expectedFailedTitles: [mutation.expectedTestName],
    baseline: baselines.get(testFile),
  });
}

console.log(`turn alignment mutations: ${manifest.mutations.length} production mutations were killed against complete focused-suite inventories`);

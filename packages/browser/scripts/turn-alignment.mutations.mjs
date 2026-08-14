import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import YAML from "yaml";
import { captureBaseline, exactFields, requireSingleOccurrence, verifyMutation } from "./lib/vitest-mutation-runner.mjs";

const fixturePath = resolve("src/testdata/turn-alignment.yaml");
const manifestPath = resolve("src/testdata/turn-alignment.mutations.yaml");
const document = YAML.parseDocument(readFileSync(manifestPath, "utf8"), { strict: true, uniqueKeys: true });
if (document.errors.length) throw new Error(`turn alignment mutation manifest is invalid: ${document.errors.map((error) => error.message).join("; ")}`);
const manifest = document.toJS();
exactFields(manifest, ["expectedMutationCount", "expectedLoaderMutationCount", "loaderMutations", "mutations"], "turn alignment mutation manifest");
if (!Number.isSafeInteger(manifest.expectedMutationCount) || manifest.expectedMutationCount < 0 || !Array.isArray(manifest.mutations) || manifest.mutations.length !== manifest.expectedMutationCount) {
  throw new Error("turn alignment mutation manifest count must match its exact mutation inventory");
}
if (!Number.isSafeInteger(manifest.expectedLoaderMutationCount) || manifest.expectedLoaderMutationCount < 0 || !Array.isArray(manifest.loaderMutations) || manifest.loaderMutations.length !== manifest.expectedLoaderMutationCount) {
  throw new Error("turn alignment loader mutation manifest count must match its exact mutation inventory");
}
const fields = ["name", "target", "find", "replace", "expectedTestName", "expectedFailurePattern"];
for (const [index, mutation] of manifest.mutations.entries()) {
  exactFields(mutation, fields, `turn alignment mutation ${index}`);
  for (const field of fields) if (typeof mutation[field] !== "string" || mutation[field].length === 0) throw new Error(`turn alignment mutation ${index}.${field} must be a non-empty string`);
  requireSingleOccurrence(readFileSync(resolve(mutation.target), "utf8"), mutation.find, mutation.name);
}
if (new Set(manifest.mutations.map(({ name }) => name)).size !== manifest.mutations.length) throw new Error("turn alignment mutation names must be unique");
const loaderFields = ["name", "find", "replace", "expectedError"];
const fixtureSource = readFileSync(fixturePath, "utf8");
for (const [index, mutation] of manifest.loaderMutations.entries()) {
  exactFields(mutation, loaderFields, `turn alignment loader mutation ${index}`);
  for (const field of loaderFields) if (typeof mutation[field] !== "string" || mutation[field].length === 0) throw new Error(`turn alignment loader mutation ${index}.${field} must be a non-empty string`);
  requireSingleOccurrence(fixtureSource, mutation.find, mutation.name);
}
if (new Set(manifest.loaderMutations.map(({ name }) => name)).size !== manifest.loaderMutations.length) throw new Error("turn alignment loader mutation names must be unique");
if (new Set(manifest.loaderMutations.map(({ expectedError }) => expectedError)).size !== manifest.loaderMutations.length) throw new Error("turn alignment loader mutations must each assert an independent error");

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

const loaderMutationNames = manifest.loaderMutations.map(({ name }) => `rejects malformed alignment fixture: ${name}`);
const loaderBaseline = captureBaseline("src/lib/turn-alignment.test.ts", "turn alignment loader baseline");
for (const title of loaderMutationNames) if (!loaderBaseline.titles.has(title)) throw new Error(`turn alignment loader baseline is missing ${title}`);

console.log(`turn alignment mutations: ${manifest.mutations.length} production mutations and ${manifest.loaderMutations.length} loader mutations were verified against complete focused-suite inventories`);

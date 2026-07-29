import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import YAML from "yaml";

const manifestPath = resolve("src/testdata/schema-boundary.manifest.yaml");
const document = YAML.parseDocument(readFileSync(manifestPath, "utf8"), { strict: true, uniqueKeys: true });
if (document.errors.length) throw new Error(`schema-boundary mutation manifest is invalid: ${document.errors.map((error) => error.message).join("; ")}`);
const manifest = document.toJS();
if (!manifest || typeof manifest !== "object" || Array.isArray(manifest)) throw new Error("schema-boundary manifest root must be an object");

const rootFields = ["expectedBehaviorCaseCount", "requiredBehaviorNames", "requiredStopReasons", "nullableTurnCaseNames", "explicitPrecedenceCaseNames", "depthCaseNames", "stopReasonCaseNames", "providerCompositionCaseNames", "expectedBehaviorLoaderMutationCount", "behaviorLoaderMutations", "expectedBehaviorTestCount", "requiredBehaviorTestNames", "expectedMutationCount", "mutations", "expectedReporterControlCount", "reporterControls"];
exactFields(manifest, rootFields, "manifest");
for (const field of ["expectedBehaviorLoaderMutationCount", "expectedBehaviorTestCount", "expectedMutationCount", "expectedReporterControlCount"]) {
  if (!Number.isSafeInteger(manifest[field]) || manifest[field] < 0) throw new Error(`schema-boundary manifest ${field} must be a non-negative safe integer`);
}
const requiredBehaviorTestNames = stringSet(manifest.requiredBehaviorTestNames, "requiredBehaviorTestNames");
if (requiredBehaviorTestNames.length !== manifest.expectedBehaviorTestCount) throw new Error("schema-boundary manifest behavior test names must match expectedBehaviorTestCount");

const loaderFields = ["name", "find", "replace", "expectedError"];
if (!Array.isArray(manifest.behaviorLoaderMutations) || manifest.behaviorLoaderMutations.length !== manifest.expectedBehaviorLoaderMutationCount) throw new Error("schema-boundary manifest behavior loader mutations must match their exact count");
for (const [index, row] of manifest.behaviorLoaderMutations.entries()) validateStringRow(row, loaderFields, `behaviorLoaderMutations[${index}]`);
if (new Set(manifest.behaviorLoaderMutations.map(({ name }) => name)).size !== manifest.behaviorLoaderMutations.length) throw new Error("schema-boundary behavior loader mutation names must be unique");
const expectedExecutedTestNames = [
  ...requiredBehaviorTestNames,
  ...manifest.behaviorLoaderMutations.map(({ name }) => `rejects malformed behavior fixture: ${name}`),
];

const mutationFields = ["name", "target", "find", "replace", "expectedTestName", "expectedFailurePattern"];
if (!Array.isArray(manifest.mutations) || manifest.mutations.length !== manifest.expectedMutationCount) throw new Error("schema-boundary manifest production mutations must match their exact count");
for (const [index, mutation] of manifest.mutations.entries()) {
  validateStringRow(mutation, mutationFields, `mutations[${index}]`);
  if (!requiredBehaviorTestNames.includes(mutation.expectedTestName)) throw new Error(`${mutation.name}: expectedTestName must identify a required behavior test`);
  compilePattern(mutation.expectedFailurePattern, `${mutation.name}.expectedFailurePattern`);
}
if (new Set(manifest.mutations.map(({ name }) => name)).size !== manifest.mutations.length) throw new Error("schema-boundary production mutation names must be unique");

const controlFields = ["name", "expectedTestName", "expectedFailurePattern", "actualFailureTestName", "actualFailureMessage", "expectedRejectionPattern"];
if (!Array.isArray(manifest.reporterControls) || manifest.reporterControls.length !== manifest.expectedReporterControlCount) throw new Error("schema-boundary reporter controls must match their exact count");
for (const [index, control] of manifest.reporterControls.entries()) {
  validateStringRow(control, controlFields, `reporterControls[${index}]`);
  if (!requiredBehaviorTestNames.includes(control.expectedTestName) || !expectedExecutedTestNames.includes(control.actualFailureTestName)) throw new Error(`${control.name}: reporter control test names must identify executed tests`);
  const synthetic = syntheticReport(expectedExecutedTestNames, control.actualFailureTestName, control.actualFailureMessage);
  let rejected = false;
  try {
    verifyStructuredReport(synthetic, control, expectedExecutedTestNames);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!compilePattern(control.expectedRejectionPattern, `${control.name}.expectedRejectionPattern`).test(message)) throw new Error(`${control.name}: control rejected for the wrong reason: ${message}`);
    rejected = true;
  }
  if (!rejected) throw new Error(`${control.name}: structured reporter verifier accepted an unrelated failed test`);
}

for (const mutation of manifest.mutations) {
  const target = resolve(mutation.target);
  const source = readFileSync(target, "utf8");
  const occurrences = source.split(mutation.find).length - 1;
  if (occurrences !== 1) throw new Error(`${mutation.name}: mutation target must occur exactly once, received ${occurrences}`);
  const result = spawnSync(
    "pnpm",
    ["exec", "vitest", "run", "src/schema-boundary.behavior.test.tsx", "--reporter=json"],
    {
      cwd: process.cwd(),
      encoding: "utf8",
      env: { ...process.env, TRANSCRIPT_BROWSER_MUTATION_JSON: JSON.stringify(mutation) },
    },
  );
  if (result.error) throw new Error(`${mutation.name}: behavior mutation process failed before Vitest: ${result.error.message}`);
  if (result.status === 0) throw new Error(`${mutation.name}: isolated schema behavior mutation survived`);
  let report;
  try {
    report = JSON.parse(result.stdout);
  } catch (error) {
    throw new Error(`${mutation.name}: Vitest JSON reporter produced invalid structured output; setup or collection failed: ${error instanceof Error ? error.message : String(error)}; stderr=${result.stderr}`);
  }
  verifyStructuredReport(report, mutation, expectedExecutedTestNames);
}

console.log(`schema-boundary mutations: ${manifest.mutations.length} executable mutations each failed only their designated mounted behavior test`);

function exactFields(value, fields, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${label} must be an object`);
  const keys = Object.keys(value);
  const unknown = keys.filter((field) => !fields.includes(field));
  const missing = fields.filter((field) => !(field in value));
  if (unknown.length || missing.length) throw new Error(`${label} fields are invalid; unknown=${unknown.join(",")} missing=${missing.join(",")}`);
}

function validateStringRow(row, fields, label) {
  exactFields(row, fields, label);
  for (const field of fields) if (typeof row[field] !== "string" || row[field].length === 0) throw new Error(`${label}.${field} must be a non-empty string`);
}

function stringSet(value, label) {
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== "string" || entry.length === 0) || new Set(value).size !== value.length) throw new Error(`schema-boundary manifest ${label} must contain unique non-empty strings`);
  return value;
}

function compilePattern(pattern, label) {
  try {
    return new RegExp(pattern);
  } catch (error) {
    throw new Error(`${label} must be a valid regular expression: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function verifyStructuredReport(report, mutation, expectedTestNames) {
  if (!report || typeof report !== "object" || !Array.isArray(report.testResults) || report.testResults.length !== 1) throw new Error(`${mutation.name}: collection/setup/module error: expected exactly one structured test file result`);
  const fileResult = report.testResults[0];
  if (!fileResult || !Array.isArray(fileResult.assertionResults)) throw new Error(`${mutation.name}: collection/setup/module error: assertion results are unavailable`);
  const assertions = fileResult.assertionResults;
  const actualNames = assertions.map(({ title }) => title);
  if (assertions.length !== expectedTestNames.length || actualNames.some((name) => !expectedTestNames.includes(name)) || expectedTestNames.some((name) => !actualNames.includes(name))) {
    throw new Error(`${mutation.name}: collection/setup/module error: executed test inventory does not match the manifest`);
  }
  if (assertions.some(({ status }) => status !== "passed" && status !== "failed")) throw new Error(`${mutation.name}: collection/setup/module error: every expected test must finish as passed or failed`);
  const failed = assertions.filter(({ status }) => status === "failed");
  if (failed.length !== 1 || report.numFailedTests !== 1 || report.numPassedTests !== expectedTestNames.length - 1) throw new Error(`${mutation.name}: expected exactly one designated test failure and all other tests passing`);
  const failure = failed[0];
  if (failure.title !== mutation.expectedTestName) throw new Error(`${mutation.name}: designated test ${mutation.expectedTestName} did not fail; unrelated test ${failure.title} failed`);
  const diagnostic = Array.isArray(failure.failureMessages) ? failure.failureMessages.join("\n") : "";
  if (!compilePattern(mutation.expectedFailurePattern, `${mutation.name}.expectedFailurePattern`).test(diagnostic)) throw new Error(`${mutation.name}: designated test failed without its invariant diagnostic`);
}

function syntheticReport(testNames, failedTestName, failureMessage) {
  return {
    numFailedTests: 1,
    numPassedTests: testNames.length - 1,
    testResults: [{
      assertionResults: testNames.map((title) => title === failedTestName
        ? { title, status: "failed", failureMessages: [failureMessage] }
        : { title, status: "passed", failureMessages: [] }),
    }],
  };
}

import { readFileSync, unlinkSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

/**
 * Shared "baseline capture -> mutate -> compare" core for this package's
 * isolated-source-mutation gates (scripts/initial-position.mutations.mjs,
 * scripts/provider-policy.mutations.mjs). Both runners drive Vitest against
 * a real production file mutated in-memory by the matching
 * `vitest.config.ts` transform plugin (matched by env-var name, see
 * `envKey` below), and both need the exact same structural proof: the WHOLE
 * test file runs to completion (never `-t`-filtered to one test), a clean
 * unmutated baseline is captured first, and each mutant must reproduce the
 * baseline's full test count with exactly its declared failing-test set and
 * every other baseline test still passing.
 *
 * This is a per-repo, not cross-repo, module (see peasant's own
 * web/scripts/lib/vitest-mutation-runner.mjs for the same pattern applied
 * to peasant's independent runners).
 */

/** Verify `value` has exactly the fields in `expected` -- no more, no fewer. */
export function exactFields(value, expected, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${label} must be an object`);
  const keys = Object.keys(value);
  const unknown = keys.filter((field) => !expected.includes(field));
  const missing = expected.filter((field) => !(field in value));
  if (unknown.length || missing.length) throw new Error(`${label} fields are invalid; unknown=${unknown.join(",")} missing=${missing.join(",")}`);
}

/** Verify `find` occurs exactly once in `source` before it is safe to mutate. */
export function requireSingleOccurrence(source, find, label) {
  const occurrences = source.split(find).length - 1;
  if (occurrences !== 1) throw new Error(`${label}: mutation anchor must occur exactly once, received ${occurrences}`);
}

/**
 * Run `testFile` to completion (never filtered by `-t`, so the full file
 * always executes) and return both the structured Vitest JSON report (the
 * sole source of truth for which tests ran and which passed/failed) and the
 * combined human-readable text from a second, simultaneous `verbose`
 * reporter. The text fallback exists because some failures here are wrapped
 * `AggregateError`s whose nested causes the JSON reporter does not
 * serialize into `failureMessages`. Structural pass/fail proof always comes
 * from the JSON report; the text is used only to confirm the expected
 * diagnostic phrase is present, never as a substitute for the structural
 * check.
 */
export function runSuite(testFile, env, label) {
  const reportPath = resolve(`/tmp/tb-mutation-runner-report-${process.pid}-${Math.random().toString(36).slice(2)}.json`);
  const result = spawnSync(
    "pnpm",
    ["exec", "vitest", "run", testFile, "--reporter=json", "--reporter=verbose", `--outputFile.json=${reportPath}`],
    { cwd: process.cwd(), encoding: "utf8", maxBuffer: 16 * 1024 * 1024, env: { ...process.env, ...env } },
  );
  let report;
  try {
    report = JSON.parse(readFileSync(reportPath, "utf8"));
  } catch (error) {
    throw new Error(`${label}: Vitest JSON reporter did not produce a readable inventory: ${error instanceof Error ? error.message : String(error)}; stdout=${result.stdout}; stderr=${result.stderr}`);
  } finally {
    unlinkSync(reportPath);
  }
  const assertions = Array.isArray(report?.testResults)
    ? report.testResults.flatMap((suite) => (Array.isArray(suite?.assertionResults) ? suite.assertionResults : []))
    : [];
  return { status: result.status, text: `${result.stdout}\n${result.stderr}`, assertions, report };
}

/**
 * Setup control: prove the suite is clean against the real, unmutated
 * production source before trusting any mutant. This both rules out a
 * pre-existing failure masquerading as a mutation's designated failure and
 * establishes the exact total test inventory every mutant run must match.
 */
export function captureBaseline(testFile, label) {
  const baseline = runSuite(testFile, {}, label);
  if (baseline.status !== 0 || baseline.assertions.length === 0 || baseline.assertions.some((assertion) => assertion.status !== "passed")) {
    throw new Error(`${label} must pass cleanly with at least one test before any mutation runs; received ${JSON.stringify(baseline.assertions.map((assertion) => [assertion.title, assertion.status]))}`);
  }
  return { ...baseline, titles: new Set(baseline.assertions.map((assertion) => assertion.title)) };
}

/**
 * Verify one mutation's mutated run against the captured baseline: the
 * full baseline test count ran (nothing silently skipped), the exact SET
 * of failed titles equals `expectedFailedTitles`, every other baseline
 * title is still 'passed', and the failure text matches
 * `mutation.expectedFailurePattern`.
 *
 * `expectedFailedTitles` is supplied by the caller (not read off a fixed
 * manifest field name) because the two callers model it differently:
 * initial-position's mutations are genuine multi-test cascades
 * (`expectedFailedTestNames: string[]`), while provider-policy's are
 * single-test by design (`expectedTestName: string`) -- an empirically
 * justified divergence in the FIXTURE shape, not in this comparison logic.
 *
 * Diagnostic-pattern matching is case-sensitive (no `i` flag) in both
 * callers already, so this shared implementation preserves that -- every
 * `expectedFailurePattern` is authored in the same change as the message
 * it matches, so there is no legitimate case drift to tolerate.
 */
export function verifyMutation({ testFile, mutation, envKey, expectedFailedTitles, baseline, label = mutation.name }) {
  const missing = expectedFailedTitles.filter((name) => !baseline.titles.has(name));
  if (missing.length > 0) throw new Error(`${label}: expected failing test name(s) not present in the baseline inventory: ${missing.join(", ")}`);

  const { status, text, assertions } = runSuite(testFile, { [envKey]: JSON.stringify(mutation) }, label);
  if (status === 0) throw new Error(`${label}: executable production mutation survived the focused gate`);
  if (assertions.length !== baseline.assertions.length) {
    throw new Error(`${label}: expected the full baseline inventory (${baseline.assertions.length} tests) to run under the mutation, received ${assertions.length}; the mutation likely short-circuited the suite before every test executed`);
  }
  const failedTitles = assertions.filter((assertion) => assertion.status === "failed").map((assertion) => assertion.title).sort();
  const expectedTitles = [...expectedFailedTitles].sort();
  if (JSON.stringify(failedTitles) !== JSON.stringify(expectedTitles)) {
    throw new Error(`${label}: expected exactly [${expectedTitles.join(", ")}] to fail and every other test in the ${baseline.assertions.length}-test inventory to pass, received [${failedTitles.join(", ")}] failed`);
  }
  const passedTitles = assertions.filter((assertion) => assertion.status === "passed").map((assertion) => assertion.title).sort();
  const expectedPassedTitles = [...baseline.titles].filter((title) => !expectedFailedTitles.includes(title)).sort();
  if (JSON.stringify(passedTitles) !== JSON.stringify(expectedPassedTitles)) {
    throw new Error(`${label}: every non-designated test must still pass under the mutation; expected passing [${expectedPassedTitles.join(", ")}], received passing [${passedTitles.join(", ")}]`);
  }
  const designatedFailureText = assertions
    .filter((assertion) => assertion.status === "failed")
    .flatMap((assertion) => (Array.isArray(assertion.failureMessages) ? assertion.failureMessages : []))
    .join("\n");
  if (!new RegExp(mutation.expectedFailurePattern).test(`${designatedFailureText}\n${text}`)) {
    throw new Error(`${label}: the designated failure(s) did not carry the expected diagnostic; expected ${mutation.expectedFailurePattern}, received assertion messages ${JSON.stringify(designatedFailureText)} and process output ${text.trim()}`);
  }
}

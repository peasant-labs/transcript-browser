import { readFileSync } from "node:fs";
import { join, relative } from "node:path";

/**
 * Manifest-regression gate.
 *
 * transcript-browser must NOT declare its own lucide-react or recharts
 * dependency: icons come through @peasant-labs/fairtrade/icons (the published
 * lucide passthrough) and charts through @peasant-labs/fairtrade/ui, so the
 * design system owns a single copy. This gate fails the build if either engine
 * package reappears in any dependency field of any workspace manifest, so the
 * "no own icon/chart engine" contract can't silently regress.
 */

const ROOT = new URL("..", import.meta.url).pathname;

// Every workspace manifest that ships or builds transcript-browser.
const MANIFESTS = [
  "package.json",
  "packages/browser/package.json",
  "packages/analytics/package.json",
  "packages/types/package.json",
  "examples/minimal/package.json",
];

// Banned engine packages -> where the capability must instead come from.
const BANNED = new Map([
  ["lucide-react", "import icons from @peasant-labs/fairtrade/icons"],
  ["recharts", "render charts via @peasant-labs/fairtrade/ui (ChartBar/ChartLine/Sparkline)"],
]);

const DEP_FIELDS = [
  "dependencies",
  "devDependencies",
  "peerDependencies",
  "optionalDependencies",
];

const violations = [];

for (const manifest of MANIFESTS) {
  const path = join(ROOT, manifest);
  let pkg;
  try {
    pkg = JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    console.error(
      `assert-no-engine-deps failed: could not read/parse ${manifest} (${error.message}). ` +
        `Fix the manifest JSON, then re-run \`pnpm gates\`.`,
    );
    process.exit(1);
  }
  for (const field of DEP_FIELDS) {
    const deps = pkg[field];
    if (!deps) continue;
    for (const [name, fix] of BANNED) {
      if (Object.prototype.hasOwnProperty.call(deps, name)) {
        violations.push(
          `${relative(ROOT, path) || manifest}: ${field}.${name} (${deps[name]}) — remove it and ${fix}`,
        );
      }
    }
  }
}

if (violations.length > 0) {
  console.error(
    "assert-no-engine-deps failed: transcript-browser re-declared an icon/chart " +
      "engine dependency it must consume from @peasant-labs/fairtrade instead.\n" +
      "WHY: a local lucide-react/recharts dep duplicates the copy the design " +
      "system already ships (risking a second, drifting version in consumers).\n" +
      "WHERE:",
  );
  for (const v of violations) console.error(`  - ${v}`);
  console.error(
    "HOW TO FIX: delete the listed dependency entries, re-point usage to the " +
      "fairtrade exports above, then re-run `pnpm gates`.",
  );
  process.exit(1);
}

console.log(`Engine-dep regression gate passed (${MANIFESTS.length} manifests, no lucide-react/recharts).`);

// Toggles the sibling workspace packages in/out of this package's
// devDependencies around `npm pack`.
//
// The workspace dep (`@peasant-labs/types`) is needed
// at BUILD time (tsup inlines them into dist), but their `workspace:*` specifier
// is meaningless to an external `npm`/`file:` consumer and must NOT survive in
// the published manifest. `prepack` strips them; `postpack` restores them so the
// monorepo keeps resolving them via pnpm symlinks.
//
// Usage: node scripts/workspace-devdeps.mjs <strip|restore>

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const manifestPath = resolve(here, "../package.json");
const WORKSPACE_DEPS = ["@peasant-labs/types"];
const WORKSPACE_SPEC = ["workspace", "*"].join(":");

const mode = process.argv[2];
const pkg = JSON.parse(readFileSync(manifestPath, "utf8"));
pkg.devDependencies ??= {};

if (mode === "strip") {
  for (const dep of WORKSPACE_DEPS) delete pkg.devDependencies[dep];
} else if (mode === "restore") {
  for (const dep of WORKSPACE_DEPS) pkg.devDependencies[dep] = WORKSPACE_SPEC;
  // Keep devDependencies alphabetically sorted for a stable diff.
  pkg.devDependencies = Object.fromEntries(
    Object.entries(pkg.devDependencies).sort(([a], [b]) => a.localeCompare(b)),
  );
} else {
  console.error("usage: workspace-devdeps.mjs <strip|restore>");
  process.exit(1);
}

writeFileSync(manifestPath, `${JSON.stringify(pkg, null, 2)}\n`);

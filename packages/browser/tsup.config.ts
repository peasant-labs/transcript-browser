import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig } from "tsup";

/**
 * The published tarball must be self-contained for an EXTERNAL npm consumer:
 *
 *  - Canonical wire types and runtime values come from
 *    `@peasant-labs/schema`, which stays external as a real package dependency.
 *  - `react` / `react-dom` stay EXTERNAL (peer deps — the host owns React).
 *  - `@xyflow/react` stays EXTERNAL and is an OPTIONAL peer (only the graph view
 *    needs it).
 *
 * The other runtime deps (clsx, diff, react-markdown, remark-gfm, shiki) are
 * EXTERNALIZED by default — tsup keeps every package.json
 * `dependency`/`peerDependency` external, so they stay real npm `dependencies`
 * the consumer installs (they are NOT inlined into the bundle).
 * `@peasant-labs/fairtrade` is a PEER dependency (also external): the host app
 * supplies one fairtrade copy, preventing a nested dependency from rendering
 * stale design-system chrome.
 */
export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  dts: true,
  clean: true,
  sourcemap: true,
  external: ["react", "react-dom", "@xyflow/react"],
  // Ship DOMAIN-ONLY CSS. `dist/styles.css` carries ONLY the `tb-`-prefixed
  // domain rules — it does NOT re-bundle fairtrade fonts/tokens/base/components.
  // Re-bundling them per package meant an app loading both this and
  // @peasant-labs/analytics shipped the fairtrade sheets 2–3×. The consumer
  // imports the fairtrade CSS ONCE at the app root, then each package's domain
  // styles (see the banner below).
  onSuccess: async () => {
    const styles = readFileSync(resolve(__dirname, "src/styles.css"), "utf8");
    const banner =
      "/*\n * @peasant-labs/transcript-browser — DOMAIN-ONLY stylesheet (`tb-`-prefixed).\n" +
      " * Does NOT include fairtrade fonts/tokens/base/components — import those ONCE\n" +
      " * at your app root BEFORE this sheet:\n" +
      ' *   import "@peasant-labs/fairtrade/fonts.css";\n' +
      ' *   import "@peasant-labs/fairtrade/tokens.css";\n' +
      ' *   import "@peasant-labs/fairtrade/base.css";\n' +
      ' *   import "@peasant-labs/fairtrade/components.css";\n' +
      ' *   import "@peasant-labs/transcript-browser/styles.css";\n */\n';
    writeFileSync(resolve(__dirname, "dist/styles.css"), `${banner}\n${styles}`);
  },
});

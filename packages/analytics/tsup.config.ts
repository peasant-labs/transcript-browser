import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig } from "tsup";

/**
 * The published tarball must be self-contained for an EXTERNAL npm consumer:
 *
 *  - The sibling workspace package `@peasant-labs/types` is INLINED via
 *    `noExternal` (JS + `.d.ts`) so a consumer never needs it installed.
 *  - `react` / `react-dom` stay EXTERNAL (peer deps — the host owns React).
 *  - `recharts` stays EXTERNAL and is a real npm `dependency`: it is a large
 *    charting library with its own React peer and d3 transitive deps, so we let
 *    npm install + dedupe it for the consumer rather than inlining a second
 *    copy into our bundle. (Contrast the browser package, which bundles only
 *    small leaf deps.)
 *
 * `clsx` is a tiny leaf dependency and is bundled by default.
 */
export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  dts: {
    resolve: ["@peasant-labs/types"],
  },
  clean: true,
  sourcemap: true,
  external: ["react", "react-dom", "recharts"],
  noExternal: ["@peasant-labs/types"],
  // Concatenate the theme tokens (`--tb-*` variables) and the analytics
  // component styles into a single `dist/styles.css`, so a consumer needs ONE
  // CSS import (`@peasant-labs/analytics/styles.css`) with no
  // `@peasant-labs/theme` dependency.
  onSuccess: async () => {
    const tokens = readFileSync(
      resolve(__dirname, "../theme/src/tokens.css"),
      "utf8",
    );
    const styles = readFileSync(resolve(__dirname, "src/styles.css"), "utf8");
    const banner =
      "/*\n * @peasant-labs/analytics — bundled stylesheet.\n" +
      " * Self-contained: theme tokens (--tb-*) + tb-prefixed component styles.\n" +
      " * Import once at your app root:\n" +
      ' *   import "@peasant-labs/analytics/styles.css";\n */\n';
    writeFileSync(
      resolve(__dirname, "dist/styles.css"),
      `${banner}\n${tokens}\n${styles}`,
    );
  },
});

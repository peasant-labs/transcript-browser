import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig } from "tsup";

/**
 * The published tarball must be self-contained for an EXTERNAL npm consumer:
 *
 *  - The sibling workspace package `@peasant-labs/types` is INLINED via
 *    `noExternal` (JS + `.d.ts`) so a consumer never needs it installed.
 *  - `react` / `react-dom` stay EXTERNAL (peer deps — the host owns React).
 *  - Fairtrade's chart components own chart rendering, so analytics does not
 *    carry a separate charting dependency.
 *
 * `@peasant-labs/fairtrade` and `clsx` are EXTERNALIZED by default — tsup keeps
 * every package.json `dependency` external, so they stay real npm
 * `dependencies` the consumer installs (NOT inlined into the bundle).
 */
export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  dts: {
    resolve: ["@peasant-labs/types"],
  },
  clean: true,
  sourcemap: true,
  external: ["react", "react-dom"],
  noExternal: ["@peasant-labs/types"],
  // Ship DOMAIN-ONLY CSS. `dist/styles.css` carries ONLY the `tb-a-`-prefixed
  // domain rules — it does NOT re-bundle fairtrade fonts/tokens/base. Per-package
  // re-bundling meant an app loading both this and @peasant-labs/transcript-browser
  // shipped the fairtrade sheets 2–3×. The consumer imports the fairtrade CSS
  // ONCE at the app root, then each package's domain styles.
  onSuccess: async () => {
    const styles = readFileSync(resolve(__dirname, "src/styles.css"), "utf8");
    const banner =
      "/*\n * @peasant-labs/analytics — DOMAIN-ONLY stylesheet (`tb-a-`-prefixed).\n" +
      " * Does NOT include fairtrade fonts/tokens/base — import those ONCE at your\n" +
      " * app root BEFORE this sheet:\n" +
      ' *   import "@peasant-labs/fairtrade/fonts.css";\n' +
      ' *   import "@peasant-labs/fairtrade/tokens.css";\n' +
      ' *   import "@peasant-labs/fairtrade/base.css";\n' +
      ' *   import "@peasant-labs/fairtrade/components.css";\n' +
      ' *   import "@peasant-labs/analytics/styles.css";\n */\n';
    writeFileSync(resolve(__dirname, "dist/styles.css"), `${banner}\n${styles}`);
  },
});

import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig } from "tsup";

/**
 * The published tarball must be self-contained for an EXTERNAL npm consumer:
 *
 *  - The sibling workspace packages (`@peasant-labs/types`, `@peasant-labs/theme`)
 *    are INLINED via `noExternal` so a consumer never needs them installed. This
 *    applies to both the JS bundle and the generated `.d.ts` (tsup's dts bundler
 *    follows `noExternal`, so the bundled types are emitted inline).
 *  - `react` / `react-dom` stay EXTERNAL (peer deps — the host owns React).
 *  - `@xyflow/react` stays EXTERNAL and is an OPTIONAL peer (only the graph view
 *    needs it).
 *
 * The other runtime deps (clsx, diff, lucide-react, react-markdown, remark-gfm,
 * shiki) remain real npm `dependencies` and are bundled by default.
 */
export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  // `dts.resolve` forces the declaration bundler to follow the workspace
  // packages and inline their `.d.ts` content, so the published `index.d.ts`
  // carries no `@peasant-labs/*` imports — a consumer typechecks without them.
  dts: {
    resolve: ["@peasant-labs/types", "@peasant-labs/theme"],
  },
  clean: true,
  sourcemap: true,
  external: ["react", "react-dom", "@xyflow/react"],
  noExternal: ["@peasant-labs/types", "@peasant-labs/theme"],
  // Concatenate the theme tokens (`--tb-*` variables) and the `tb-`-prefixed
  // component styles into a single `dist/styles.css`, so a consumer needs ONE
  // CSS import (`@peasant-labs/transcript-browser/styles.css`) with no
  // `@peasant-labs/theme` dependency.
  onSuccess: async () => {
    const tokens = readFileSync(
      resolve(__dirname, "../theme/src/tokens.css"),
      "utf8",
    );
    const styles = readFileSync(resolve(__dirname, "src/styles.css"), "utf8");
    const banner =
      "/*\n * @peasant-labs/transcript-browser — bundled stylesheet.\n" +
      " * Self-contained: theme tokens (--tb-*) + tb-prefixed component styles.\n" +
      " * Import once at your app root:\n" +
      ' *   import "@peasant-labs/transcript-browser/styles.css";\n */\n';
    writeFileSync(
      resolve(__dirname, "dist/styles.css"),
      `${banner}\n${tokens}\n${styles}`,
    );
  },
});

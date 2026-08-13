import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, relative } from "node:path";

/**
 * The fairtrade adapter (`adaptTranscript`, in `@peasant-labs/fairtrade`) is the
 * sole wire-parse boundary. Every transcript-browser component renders the
 * cooked `TranscriptViewModel` (parsed `ToolCallVM.args`/`.output`/`preview`/
 * `diff`, cooked `vm.diffs`/`vm.files`) and NEVER calls `JSON.parse` / a
 * `parseArgs` on a wire string.
 *
 * This audit scans the whole production source tree (excluding tests) and fails
 * if any `JSON.parse(` or `parseArgs<`/`parseArgs(` call appears anywhere in this
 * package's production source.
 */
const SRC_ROOT = dirname(fileURLToPath(import.meta.url));

function* productionSourceFiles(dir: string): Generator<string> {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      yield* productionSourceFiles(full);
    } else if (/\.tsx?$/.test(entry) && !/\.test\.tsx?$/.test(entry)) {
      yield full;
    }
  }
}

/** Drop block + line comments so the audit only inspects executable code. */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
}

describe("no wire parse outside the fairtrade adapter", () => {
  it("transcript-browser source contains zero JSON.parse / parseArgs calls", () => {
    const offenders: string[] = [];
    for (const file of productionSourceFiles(SRC_ROOT)) {
      const code = stripComments(readFileSync(file, "utf8"));
      if (/JSON\s*\.\s*parse\s*\(/.test(code) || /\bparseArgs\s*[<(]/.test(code)) {
        offenders.push(relative(SRC_ROOT, file));
      }
    }
    expect(
      offenders,
      `wire parsing must live ONLY in the fairtrade adapter; offenders: [${offenders.join(", ")}]`,
    ).toHaveLength(0);
  });

  it("uses structured Shiki output without serialized HTML injection", () => {
    const offenders: string[] = [];
    for (const file of productionSourceFiles(SRC_ROOT)) {
      const code = stripComments(readFileSync(file, "utf8"));
      if (/\bcodeToHtml\s*\(/.test(code) || /dangerouslySetInnerHTML/.test(code)) offenders.push(relative(SRC_ROOT, file));
    }
    expect(offenders, `structured highlighting is required; forbidden HTML serialization in [${offenders.join(", ")}]`).toHaveLength(0);
  });
});

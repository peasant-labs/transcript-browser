import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function productionSources(): string {
  const root = resolve(process.cwd(), "src");
  const files: string[] = [];
  const visit = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = resolve(dir, entry.name);
      if (entry.isDirectory()) visit(path);
      else if (/\.(?:ts|tsx)$/.test(entry.name) && !/\.test\.(?:ts|tsx)$/.test(entry.name)) files.push(path);
    }
  };
  visit(root);
  return files.map((file) => readFileSync(file, "utf8")).join("\n");
}

describe("schema boundary architecture", () => {
  it("keeps legacy wire compatibility out of browser production", () => {
    const source = productionSources();
    expect(source).not.toMatch(/gitContext|SessionGitContext|SessionCommit/);
    expect(source).not.toContain("@peasant-labs/types");
    expect(source).not.toMatch(/(?:type|interface)\s+Provider\b|import\s+type\s*\{[^}]*\bProvider\b/);
  });

  it("delegates canonical provider display policy without unsafe widening", () => {
    const provider = readFileSync(resolve(process.cwd(), "src/lib/provider.ts"), "utf8");
    const callSites = [
      "src/graph/GraphLegend.tsx",
      "src/header/MetadataChips.tsx",
      "src/canvas/TurnRow.tsx",
    ].map((path) => readFileSync(resolve(process.cwd(), path), "utf8")).join("\n");
    expect(provider).toContain("providerDisplayName(provider)");
    expect(provider).not.toContain("isHarness");
    expect(`${provider}\n${callSites}`).not.toMatch(/PROVIDER_LABELS|Harness\s*\|\s*string|as\s+Harness/);
  });

  it("keeps the deprecated package as a pure external schema re-export", () => {
    const source = readFileSync(resolve(process.cwd(), "../types/src/index.ts"), "utf8");
    const packageJson = JSON.parse(readFileSync(resolve(process.cwd(), "../types/package.json"), "utf8")) as {
      types?: string;
      exports?: Record<string, { types?: string }>;
    };
    const buildConfig = readFileSync(resolve(process.cwd(), "../types/tsup.config.ts"), "utf8");
    expect(source.match(/export \* from "@peasant-labs\/schema";/g)).toHaveLength(1);
    expect(source).not.toMatch(/export \* from "\.\//);
    expect(packageJson.types).toBe("./dist/index.d.ts");
    expect(packageJson.exports?.["."]?.types).toBe("./dist/index.d.ts");
    expect(buildConfig).toMatch(/dts:\s*true/);
  });

  it("documents pnpm-only package installation", () => {
    const readme = readFileSync(resolve(process.cwd(), "README.md"), "utf8");
    expect(readme).toContain("pnpm add @peasant-labs/transcript-browser");
    expect(readme).not.toMatch(/\bnpm\s+(?:i|install)\b/);
    expect(readme).not.toMatch(/(?:^|\n)\s*#{1,6}\s+[^\n]*\bnpm\b/i);
  });
});

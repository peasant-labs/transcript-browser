// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it, vi } from "vitest";
import YAML from "yaml";
import { CodeBlock } from "./primitives/CodeBlock.js";

vi.mock("shiki", () => ({
  codeToTokens: vi.fn(async () => ({
    tokens: [[{
      content: "const",
      htmlStyle: { color: "#D73A49", "--shiki-dark": "#F97583" },
    }]],
  })),
}));

type ThemeCase = { name: string; theme: "light" | "dark"; expectedLight: string; expectedDark: string };
const source = readFileSync(resolve(process.cwd(), "src/testdata/codeblock-themes.yaml"), "utf8");
const root = YAML.parse(source) as { expectedCaseCount: number; cases: ThemeCase[] };
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
if (root.cases.length !== root.expectedCaseCount || new Set(root.cases.map(({ name }) => name)).size !== root.cases.length) {
  throw new Error("codeblock theme fixture must have the declared unique case count");
}

describe("mounted structured CodeBlock themes", () => {
  for (const fixture of root.cases) {
    it(`${fixture.name}: emits both theme variables as structured DOM styles`, async () => {
      const container = document.createElement("div");
      container.dataset.theme = fixture.theme;
      const root = createRoot(container);
      await act(async () => {
        root.render(<CodeBlock code="const" lang="ts" />);
      });
      await act(async () => { await Promise.resolve(); });
      const token = container.querySelector<HTMLElement>(".shiki-token");
      expect(token?.textContent).toBe("const");
      expect(token?.style.getPropertyValue("--shiki-light")).toBe(fixture.expectedLight);
      expect(token?.style.getPropertyValue("--shiki-dark")).toBe(fixture.expectedDark);
      await act(async () => root.unmount());
    });
  }
});

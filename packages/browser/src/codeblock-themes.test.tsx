// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it, vi } from "vitest";
import { CodeBlock } from "./primitives/CodeBlock.js";
import { loadCodeBlockThemeFixture } from "./codeblock-theme-fixture.test-helper.js";

vi.mock("shiki", () => ({
  codeToTokens: vi.fn(async () => ({
    tokens: [[{
      content: "const",
      htmlStyle: { color: "#D73A49", "--shiki-dark": "#F97583" },
    }]],
  })),
}));

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
const fixture = loadCodeBlockThemeFixture();

function declarationsFor(css: string, selector: string): Map<string, string> {
  const style = document.createElement("style");
  style.textContent = css;
  document.head.append(style);
  const sheet = style.sheet;
  if (!sheet) throw new Error("styles.css could not be parsed into a CSSStyleSheet");
  const matches = Array.from(sheet.cssRules).filter(
    (rule): rule is CSSStyleRule => rule instanceof CSSStyleRule && rule.selectorText === selector,
  );
  style.remove();
  if (matches.length !== 1) throw new Error(`styles.css must contain exactly one ${selector} rule, found ${matches.length}`);
  return new Map(Array.from(matches[0]!.style).map((property) => [property, matches[0]!.style.getPropertyValue(property).trim()]));
}

describe("structured CodeBlock themes", () => {
  it("renders both structured Shiki variables without serializing HTML", async () => {
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);
    await act(async () => root.render(<CodeBlock code="const" lang="ts" />));
    await act(async () => { await Promise.resolve(); });
    const token = container.querySelector<HTMLElement>(".shiki-token");
    expect(token?.textContent).toBe("const");
    expect(token?.style.getPropertyValue("--shiki-light")).toBe(fixture.cases[0]!.expectedLight);
    expect(token?.style.getPropertyValue("--shiki-dark")).toBe(fixture.cases[0]!.expectedDark);
    await act(async () => root.unmount());
    container.remove();
  });

  it("binds the real stylesheet token rule to the light and dark variables", () => {
    const css = readFileSync(resolve(process.cwd(), "src/styles.css"), "utf8");
    expect(declarationsFor(css, ".tb-codeblock-host .shiki-token").get("color")).toBe("var(--shiki-light)");
    expect(declarationsFor(css, '[data-theme="dark"] .tb-codeblock-host .shiki-token').get("color")).toBe("var(--shiki-dark)");
  });

  it("rejects count-preserving fixture name mutations", () => {
    for (const mutation of fixture.loaderMutations) {
      const source = fixture.source.replace(mutation.find, mutation.replace);
      expect(() => loadCodeBlockThemeFixture(source)).toThrow(new RegExp(mutation.expectedError));
    }
  });
});

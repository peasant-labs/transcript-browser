// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
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

afterEach(() => {
  document.head.querySelectorAll("[data-codeblock-test-style]").forEach((node) => node.remove());
});

describe("mounted structured CodeBlock themes", () => {
  for (const themeCase of fixture.cases) {
    it(`${themeCase.name}: emits both theme variables as structured DOM styles`, async () => {
      const container = document.createElement("div");
      container.dataset.theme = themeCase.theme;
      const style = document.createElement("style");
      style.dataset.codeblockTestStyle = "true";
      style.textContent = `.tb-codeblock-host .shiki-token { color: ${themeCase.expectedLight}; } [data-theme="dark"] .tb-codeblock-host .shiki-token { color: ${themeCase.expectedDark}; }`;
      document.head.append(style);
      document.body.append(container);
      const root = createRoot(container);
      await act(async () => {
        root.render(<CodeBlock code="const" lang="ts" />);
      });
      await act(async () => { await Promise.resolve(); });
      const token = container.querySelector<HTMLElement>(".shiki-token");
      expect(token?.textContent).toBe("const");
       expect(token?.style.getPropertyValue("--shiki-light")).toBe(themeCase.expectedLight);
       expect(token?.style.getPropertyValue("--shiki-dark")).toBe(themeCase.expectedDark);
       expect(getComputedStyle(token!).color).toBe(themeCase.expectedComputedColor);
      await act(async () => root.unmount());
      container.remove();
    });
  }
});

describe("code block theme fixture validation", () => {
  for (const mutation of fixture.loaderMutations) {
    it(`rejects malformed fixture: ${mutation.name}`, () => {
      const source = fixture.source.replace(mutation.find, mutation.replace);
       expect(() => loadCodeBlockThemeFixture(source)).toThrow(new RegExp(mutation.expectedError));
    });
  }
});

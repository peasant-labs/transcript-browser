import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  PROJECT_OVERVIEW_SECTION_DEFS,
  ProjectOverview,
} from "../index.js";
import { SAMPLE_SESSIONS } from "../metrics/fixtures.js";

describe("ProjectOverview", () => {
  it("renders the real dashboard surface with fixture sessions", () => {
    const html = renderToStaticMarkup(
      createElement(ProjectOverview, {
        sessions: SAMPLE_SESSIONS,
        title: "Quality overview",
        chartHeight: 120,
      }),
    );

    expect(html).toContain("tb-a-root");
    expect(html).toContain("Quality overview");
    expect(html).toContain('aria-label="headline metrics"');
    expect(html).toContain('aria-label="visible sections"');
    expect(countMatches(html, 'class="tb-a-seg is-on"')).toBe(
      PROJECT_OVERVIEW_SECTION_DEFS.length,
    );

    expect(html).toContain("sessions per week");
    expect(html).toContain("outcome distribution");
    expect(html).toContain("typical vs. tail");
    expect(html).toContain("contributors");

    expect(html).toContain("Contributor");
    expect(html).toContain("alice");
    expect(html).toContain("8");
  });
});

function countMatches(value: string, needle: string): number {
  return value.split(needle).length - 1;
}

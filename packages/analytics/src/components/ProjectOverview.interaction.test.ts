// @vitest-environment jsdom
/**
 * DOM/RTL interaction coverage for ProjectOverview's two toggles:
 *
 *   - the visible-section chips (SectionToggle): show/hide whole cards.
 *   - the weekly-metric toggle (WeeklyMetricToggle, added for the fairtrade
 *     demo's "active | new" control): switches which series the "weekly
 *     active contributors" card plots.
 *
 * ProjectOverview.test.ts (server-static render) proves the initial markup;
 * this file proves the toggles actually work as DOM interactions — a real
 * click flips visible state, and a host-disabled entry cannot be
 * re-enabled by the user regardless of which toggle it belongs to.
 */
import "@testing-library/jest-dom/vitest";
import { createElement } from "react";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ProjectOverview } from "../index.js";
import { SAMPLE_SESSIONS } from "../metrics/fixtures.js";

// This package's vitest config does not set `globals: true` (see
// vitest.config.ts — other tests use plain `node`), so
// @testing-library/react's automatic afterEach cleanup registration never
// fires. Without it, each `render()` in this file would append to the same
// document and later tests would see duplicate nodes from earlier renders.
afterEach(cleanup);

describe("ProjectOverview — visible-section toggle", () => {
  it("hides a section on click and shows it again on a second click", () => {
    render(
      createElement(ProjectOverview, {
        sessions: SAMPLE_SESSIONS,
        title: "project overview",
      }),
    );

    expect(screen.getByText("typical vs. tail")).toBeInTheDocument();

    const typicalChip = screen.getByRole("button", { name: "typical" });
    fireEvent.click(typicalChip);
    expect(screen.queryByText("typical vs. tail")).not.toBeInTheDocument();

    fireEvent.click(typicalChip);
    expect(screen.getByText("typical vs. tail")).toBeInTheDocument();
  });

  it("does not let the user re-enable a host-disabled section", () => {
    render(
      createElement(ProjectOverview, {
        sessions: SAMPLE_SESSIONS,
        title: "project overview",
        sections: { contributorTable: false },
      }),
    );

    // The contributor table never renders: no <table> in the tree.
    expect(screen.queryByRole("table")).not.toBeInTheDocument();

    const tableChip = screen.getByRole("button", { name: "table" });
    expect(tableChip).toBeDisabled();
    expect(tableChip).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(tableChip);
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });
});

describe("ProjectOverview — weekly contributor metric toggle", () => {
  it("switches the weekly-active-contributors card to the new-contributors view and back", () => {
    render(
      createElement(ProjectOverview, {
        sessions: SAMPLE_SESSIONS,
        title: "project overview",
      }),
    );

    expect(screen.getByText("weekly active contributors")).toBeInTheDocument();
    expect(screen.queryByText("new contributors per week")).not.toBeInTheDocument();

    // Scoped to the metric toggle's own group — the visible-section chips
    // row ALSO has buttons named "active"/"new" (they show/hide the whole
    // card), so an unscoped query would be ambiguous.
    const metricToggle = screen.getByRole("group", {
      name: "weekly contributor metric",
    });
    fireEvent.click(within(metricToggle).getByRole("button", { name: "new" }));

    expect(screen.getByText("new contributors per week")).toBeInTheDocument();
    expect(screen.queryByText("weekly active contributors")).not.toBeInTheDocument();

    fireEvent.click(within(metricToggle).getByRole("button", { name: "active" }));

    expect(screen.getByText("weekly active contributors")).toBeInTheDocument();
    expect(screen.queryByText("new contributors per week")).not.toBeInTheDocument();
  });

  it("disables the 'new' option when the host hides newContributorVelocity, and the view stays on active", () => {
    render(
      createElement(ProjectOverview, {
        sessions: SAMPLE_SESSIONS,
        title: "project overview",
        sections: { newContributorVelocity: false },
      }),
    );

    expect(screen.getByText("weekly active contributors")).toBeInTheDocument();

    const metricToggle = screen.getByRole("group", {
      name: "weekly contributor metric",
    });
    const newButton = within(metricToggle).getByRole("button", { name: "new" });
    expect(newButton).toBeDisabled();

    fireEvent.click(newButton);
    expect(screen.getByText("weekly active contributors")).toBeInTheDocument();
    expect(screen.queryByText("new contributors per week")).not.toBeInTheDocument();
  });
});

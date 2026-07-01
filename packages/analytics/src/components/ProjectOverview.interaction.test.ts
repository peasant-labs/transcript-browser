// @vitest-environment jsdom
/**
 * DOM/RTL interaction coverage for ProjectOverview's two toggles:
 *
 *   - the visible-section chips (SectionToggle): show/hide whole cards.
 *   - the weekly-metric toggle (WeeklyMetricToggle, on the "weekly active
 *     contributors" card): switches which series that ONE card plots
 *     between "active" and "new" — it does NOT replace, hide, or duplicate
 *     the always-visible "new contributors per week" card; the fairtrade
 *     demo shows both at once.
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

    // Section chips carry a "<label> section" accessible name (distinct
    // from the visible chip text) so they never collide, for a screen
    // reader, with same-labeled controls elsewhere on the page (e.g. the
    // weekly-metric toggle's "active"/"new" buttons below).
    const typicalChip = screen.getByRole("button", { name: "typical section" });
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

    const tableChip = screen.getByRole("button", { name: "table section" });
    expect(tableChip).toBeDisabled();
    expect(tableChip).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(tableChip);
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("the 'new' section chip shows/hides the standalone new-contributors-per-week card", () => {
    render(
      createElement(ProjectOverview, {
        sessions: SAMPLE_SESSIONS,
        title: "project overview",
      }),
    );

    // Both cards are on screen at once — the toggle on the weekly-active
    // card does not replace this standalone card.
    expect(screen.getByText("weekly active contributors")).toBeInTheDocument();
    expect(screen.getByText("new contributors per week")).toBeInTheDocument();

    const newChip = screen.getByRole("button", { name: "new section" });
    fireEvent.click(newChip);
    expect(screen.queryByText("new contributors per week")).not.toBeInTheDocument();
    // The other card is unaffected by this chip.
    expect(screen.getByText("weekly active contributors")).toBeInTheDocument();

    fireEvent.click(newChip);
    expect(screen.getByText("new contributors per week")).toBeInTheDocument();
  });
});

describe("ProjectOverview — weekly contributor metric toggle", () => {
  it("switches the weekly-active-contributors card's plotted series and back, without touching the standalone new-contributors card", () => {
    render(
      createElement(ProjectOverview, {
        sessions: SAMPLE_SESSIONS,
        title: "project overview",
      }),
    );

    const weeklyCard = screen.getByText("weekly active contributors").closest(
      "section",
    ) as HTMLElement;
    expect(
      within(weeklyCard).getByText(/distinct contributors active each week/),
    ).toBeInTheDocument();

    // Scoped to the metric toggle's own group — the visible-section chips
    // row ALSO has "new section"/"active section" buttons, so an unscoped
    // query for the bare "active"/"new" accessible names should only ever
    // find the toggle (chip names carry the "section" suffix).
    const metricToggle = screen.getByRole("group", {
      name: "weekly contributor metric",
    });
    fireEvent.click(within(metricToggle).getByRole("button", { name: "new" }));

    expect(
      within(weeklyCard).getByText(/new contributors per week/),
    ).toBeInTheDocument();
    // The card's own title never changes — only its subtitle/plotted series.
    expect(screen.getByText("weekly active contributors")).toBeInTheDocument();

    fireEvent.click(within(metricToggle).getByRole("button", { name: "active" }));
    expect(
      within(weeklyCard).getByText(/distinct contributors active each week/),
    ).toBeInTheDocument();
  });

  it("disables the 'new' option when the host hides newContributorVelocity, and the view stays on active", () => {
    render(
      createElement(ProjectOverview, {
        sessions: SAMPLE_SESSIONS,
        title: "project overview",
        sections: { newContributorVelocity: false },
      }),
    );

    // Host-hidden also removes the always-visible standalone card.
    expect(screen.queryByText("new contributors per week")).not.toBeInTheDocument();
    expect(screen.getByText("weekly active contributors")).toBeInTheDocument();

    const metricToggle = screen.getByRole("group", {
      name: "weekly contributor metric",
    });
    const newButton = within(metricToggle).getByRole("button", { name: "new" });
    expect(newButton).toBeDisabled();

    fireEvent.click(newButton);
    expect(
      screen.getByText(/distinct contributors active each week/),
    ).toBeInTheDocument();
  });
});

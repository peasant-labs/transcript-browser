import { useMemo, useState } from "react";
import {
  SessionDetail,
  TrajectoryGraph,
  annotateTranscript,
} from "@peasant-labs/transcript-browser";
import { ProjectOverview } from "@peasant-labs/analytics";
import "@peasant-labs/theme/tokens.css";
import "@peasant-labs/transcript-browser/styles.css";
import "@peasant-labs/analytics/styles.css";
import "@xyflow/react/dist/style.css";
import { sampleSession, samplePhases, sampleScorecard } from "./sample-session.js";
import { sampleSessions } from "./sample-analytics.js";

type View = "transcript" | "analytics";

/**
 * Renders the shared `<SessionDetail>` composer against a realistic sample.
 *
 * Demonstrates the agnosticism contract end to end:
 *  - data in via props only (`detail`, `phases`, `annotations`, `scorecard`);
 *  - theming via the `tb-dark` class toggle (no component changes);
 *  - OPTIONAL action capabilities/callbacks (toggle `canEdit` on/off);
 *  - an OPTIONAL host action slot (`renderTurnActions`) — omit it and the
 *    viewer is read-only;
 *  - the graph view enabled via the `renderGraph` render-prop (the host owns
 *    the `@xyflow/react` peer dependency + its stylesheet).
 */
export function App() {
  const [dark, setDark] = useState(true);
  const [labeling, setLabeling] = useState(true);
  const [canEdit, setCanEdit] = useState(true);
  const [view, setView] = useState<View>("transcript");

  // Host-derived annotations: the package never derives these implicitly — the
  // app calls the exported pure helper and passes the result in.
  const annotations = useMemo(() => annotateTranscript(sampleSession.turns), []);

  return (
    <div className={dark ? "tb-dark" : undefined}>
      <main style={{ background: "var(--tb-canvas)", color: "var(--tb-ink)", minHeight: "100vh", fontFamily: "var(--tb-font-sans)" }}>
        <div
          style={{
            position: "sticky",
            top: 0,
            zIndex: 80,
            display: "flex",
            gap: "0.5rem",
            alignItems: "center",
            justifyContent: "flex-end",
            padding: "0.5rem 1.5rem",
            background: "var(--tb-surface)",
            borderBottom: "1px solid var(--tb-rule)",
          }}
        >
          {/* Top-level view switch: the agnostic viewer vs. the analytics layer. */}
          <div style={{ marginRight: "auto", display: "flex", gap: "0.25rem" }}>
            <button
              type="button"
              onClick={() => setView("transcript")}
              style={{ fontWeight: view === "transcript" ? 700 : 400 }}
            >
              Transcript
            </button>
            <button
              type="button"
              onClick={() => setView("analytics")}
              style={{ fontWeight: view === "analytics" ? 700 : 400 }}
            >
              Analytics
            </button>
          </div>
          <button type="button" onClick={() => setDark((v) => !v)}>
            {dark ? "Light" : "Dark"} theme
          </button>
          {view === "transcript" ? (
            <>
              <button type="button" onClick={() => setLabeling((v) => !v)}>
                {labeling ? "Hide" : "Show"} turn action slot
              </button>
              <button type="button" onClick={() => setCanEdit((v) => !v)}>
                canEdit: {canEdit ? "on" : "off"}
              </button>
            </>
          ) : null}
        </div>

        {view === "analytics" ? (
          // The analytics layer: a generated SessionSummary[] fixture passed
          // straight in as props. The host owns how an opaque contributorId is
          // displayed via `renderContributor`; sections are toggle-able.
          <div style={{ padding: "1.5rem" }}>
            <ProjectOverview
              sessions={sampleSessions}
              title="Collective pulse"
              subtitle={`${sampleSessions.length} sessions · generated fixture`}
              contributorLimit={10}
              renderContributor={(row) => (
                <span style={{ fontWeight: 600, textTransform: "capitalize" }}>
                  {row.contributorId}
                </span>
              )}
            />
          </div>
        ) : (
        /* The 48px control bar above is the host's own chrome — pass its height
            as `stickyTop` so the viewer's sticky header sits below it. */
        <SessionDetail
          detail={sampleSession}
          phases={samplePhases}
          annotations={annotations}
          scorecard={sampleScorecard}
          stickyTop={48}
          breadcrumb={[
            { label: "Sessions", href: "#sessions" },
            { label: sampleSession.project ?? "project", href: "#project" },
            { label: sampleSession.id.slice(0, 8) },
          ]}
          // --- Capability flags + callbacks (actions OUT via the contract) ---
          capabilities={{
            canEdit,
            canContribute: true,
            canCopyLink: true,
            canDownload: true,
            canChatWithTrace: true,
          }}
          callbacks={{
            onEdit: () => alert("Host would open its edit dialog"),
            onContribute: () => alert("Host would open its contribute/share flow"),
            onCopyLink: (url) => alert(`Host copied: ${url}`),
            onChatWithTrace: () => alert("Host would open chat-with-trace"),
          }}
          // Session-level share link — host owns the route shape.
          sessionLinkBuilder={(d) => `https://example.test/sessions/${d.id}`}
          // OPTIONAL per-turn action slot — proves actions flow OUT via a slot,
          // not baked into the package. Toggle it off for a read-only viewer.
          renderTurnActions={
            labeling
              ? (turn) =>
                  turn.role === "assistant" ? (
                    <button
                      type="button"
                      style={{ font: "inherit", fontSize: "11px", cursor: "pointer" }}
                      onClick={() => alert(`Host would label turn #${turn.index}`)}
                    >
                      Label
                    </button>
                  ) : null
              : undefined
          }
          // The graph view carries the @xyflow/react peer dep, so the host wires
          // it via a render-prop instead of the package importing it directly.
          renderGraph={(props) => <TrajectoryGraph {...props} />}
        />
        )}
      </main>
    </div>
  );
}

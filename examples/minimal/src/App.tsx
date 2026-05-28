import { useState } from "react";
import { TranscriptCanvas } from "@peasant-labs/transcript-browser";
import "@peasant-labs/theme/tokens.css";
import "@peasant-labs/transcript-browser/styles.css";
import { sampleSession, samplePhases } from "./sample-session.js";

/**
 * Renders the shared `<TranscriptCanvas>` against a realistic sample session.
 *
 * Demonstrates the agnosticism contract:
 *  - data in via props only (`turns`, `phases`, `commits`, `provider`);
 *  - theming via the `tb-dark` class toggle (no component changes);
 *  - an OPTIONAL host action slot (`renderTurnActions`) — remove it and the
 *    viewer is fully read-only.
 */
export function App() {
  const [dark, setDark] = useState(true);
  const [labeling, setLabeling] = useState(false);

  return (
    <div className={dark ? "tb-dark" : undefined}>
      <main
        style={{
          background: "var(--tb-canvas)",
          color: "var(--tb-ink)",
          minHeight: "100vh",
          fontFamily: "var(--tb-font-sans)",
        }}
      >
        <div style={{ maxWidth: 860, margin: "0 auto", padding: "1.5rem 1rem" }}>
          <header
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "1rem",
              marginBottom: "1rem",
            }}
          >
            <div>
              <h1 style={{ fontSize: "1.1rem", margin: 0 }}>
                transcript-browser — canvas example
              </h1>
              <p style={{ fontSize: "0.8rem", color: "var(--tb-ink-3)", margin: "0.25rem 0 0" }}>
                {sampleSession.provider} · {sampleSession.turnCount} turns ·{" "}
                {sampleSession.toolCallCount} tool calls · outcome: {sampleSession.outcome}
              </p>
            </div>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button type="button" onClick={() => setDark((v) => !v)}>
                {dark ? "Light" : "Dark"} theme
              </button>
              <button type="button" onClick={() => setLabeling((v) => !v)}>
                {labeling ? "Hide" : "Show"} host action slot
              </button>
            </div>
          </header>

          <TranscriptCanvas
            turns={sampleSession.turns}
            provider={sampleSession.provider}
            phases={samplePhases}
            commits={sampleSession.gitContext?.commits}
            phaseStickyTop={0}
            // OPTIONAL host-owned action slot — proves actions flow OUT via a
            // slot/callback, not baked into the package. Omit for read-only.
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
          />
        </div>
      </main>
    </div>
  );
}

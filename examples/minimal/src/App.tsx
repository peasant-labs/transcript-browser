import { sampleSession } from "./sample-session.js";

/**
 * Minimal proof-of-wiring: renders the shared-typed sample session as plain,
 * pretty-printed JSON. No viewer components yet — that arrives in a later task.
 */
export function App() {
  return (
    <main
      style={{
        fontFamily: "ui-monospace, SF Mono, monospace",
        padding: "1.5rem",
        maxWidth: 900,
        margin: "0 auto",
      }}
    >
      <h1 style={{ fontSize: "1.1rem" }}>
        transcript-browser — minimal example
      </h1>
      <p>
        Sample session typed against <code>@peasant-labs/types</code>{" "}
        (<code>SessionDetailPayload</code>), rendered as plain text:
      </p>
      <pre
        style={{
          background: "#14171f",
          color: "#e6e8ee",
          padding: "1rem",
          borderRadius: "0.5rem",
          overflowX: "auto",
        }}
      >
        {JSON.stringify(sampleSession, null, 2)}
      </pre>
    </main>
  );
}

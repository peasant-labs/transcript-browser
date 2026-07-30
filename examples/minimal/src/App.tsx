import { useMemo, useState } from "react";
import { TrajectoryGraph, annotateTranscript } from "@peasant-labs/transcript-browser";
import {
  TranscriptViewer,
  adaptTranscript,
  Segmented,
  Switch,
  type ToolCallVM,
  type TranscriptViewModel,
} from "@peasant-labs/fairtrade/ui";
import { ProjectOverview } from "@peasant-labs/fairtrade/analytics";
import { ScrollText, BarChart3, Moon, Sun } from "@peasant-labs/fairtrade/icons";
// Atkinson fonts are loaded via <link> + preconnect in index.html (Option B).
// Do NOT re-import fonts.css here — a CSS @import adds an extra round-trip and
// can lose the race against first paint, silently falling back to ui-sans-serif.
//
// CSS: import the FULL fairtrade bundle (components.css) ALONE. It already carries
// the tokens (`:root`) + base layer + every component rule, all in their proper
// Tailwind cascade @layers — identical to the demo's index.css. The standalone
// `base.css` is deliberately NOT imported: it ships UNLAYERED, and an unlayered
// `a { color: var(--amber) }` would beat the LAYERED `.crumb a { color: ink-3 }`
// component override, turning the breadcrumb (and every chrome link) amber.
import "@peasant-labs/fairtrade/components.css";
import "@peasant-labs/transcript-browser/styles.css";
import "@peasant-labs/fairtrade/analytics.css";
import "@xyflow/react/dist/style.css";
import { sampleSession, samplePhases, openToolsSeed, HARNESS } from "./sample-session.js";
import { sampleSessions } from "./sample-analytics.js";

type View = "transcript" | "analytics";

/**
 * Integration smoke for the canonical viewer pipeline. The transcript view is
 * the REAL assembled app rendering through the lifted composite:
 *
 *     wire SessionDetailPayload → adaptTranscript() → <TranscriptViewer>
 *
 * It renders the SAME session as the canonical fairtrade demo (sess_demo_0001),
 * so the side-by-side capture is truly height-matched and uses the same data.
 * The ONE fairtrade adapter cooks the wire payload once; the lifted composite
 * renders it.
 * The host plugs transcript-browser's @xyflow `TrajectoryGraph` engine into the
 * composite's `graphSlot` (the graph-visuals/engine split: aesthetics in
 * fairtrade, topology/pan/zoom in transcript-browser), so this also smokes the graph seam. The
 * analytics view exercises the design system's `/analytics` surface (the
 * dashboard that used to live in the retired `@peasant-labs/analytics`).
 *
 * HEIGHT: the whole app is a fixed-height (100vh) flex column and the viewer is
 * mounted into a `flex:1; min-height:0` host. The composite's `.txn-app` is
 * `height:100%`, so a BOUNDED host is what lets its `.txn-stream` scroll
 * internally — which is what reveals the sticky scrubber and anchors the keybind
 * hint. Mounting it in an auto-height page instead would scroll the whole window
 * and neither would appear.
 */
export function App() {
  const turns = sampleSession.turns ?? [];
  const [dark, setDark] = useState(true);
  const [canLabel, setCanLabel] = useState(true);
  const [canEdit, setCanEdit] = useState(true);
  const [view, setView] = useState<View>("transcript");
  // Seed the same three tool calls expanded as the demo so the trace shows real
  // tool OUTPUTS on first paint; stays host-controllable (the user can toggle).
  const [openTools, setOpenTools] = useState<Record<string, boolean>>(openToolsSeed);

  // The ONE adapter — wire → cooked TranscriptViewModel — built once. The scorecard
  // rides along on the payload, so the adapter derives the highlights-tab bands.
  const vm = useMemo<TranscriptViewModel>(
    () => adaptTranscript(sampleSession),
    [],
  );
  // Cooked tool calls by turn index, fed into the graph engine's tool nodes.
  const toolVMsByTurn = useMemo(
    () => new Map<number, ToolCallVM[]>(vm.turns.map((t) => [t.index, t.toolCalls])),
    [vm],
  );
  // The graph engine takes the host-derived pattern annotations (the package
  // never derives them implicitly).
  const graphAnnotations = useMemo(() => annotateTranscript(turns), [turns]);

  return (
    <div
      data-theme={dark ? "dark" : "light"}
      style={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        background: "var(--canvas)",
        color: "var(--ink)",
        fontFamily: "var(--font-body)",
      }}
    >
      {/* The host app's own header — identity on the left, dev controls (real
          design-system controls) on the right. A flush flex-row child of the
          100vh column (no sticky needed; it never scrolls away). */}
      <header
        style={{
          flex: "0 0 auto",
          display: "flex",
          alignItems: "center",
          gap: "1rem",
          padding: "0.5rem 1.25rem",
          minHeight: "48px",
          background: "var(--surface)",
          borderBottom: "1px solid var(--rule)",
          fontFamily: "var(--font-mono)",
        }}
      >
        <strong style={{ fontSize: "18px", color: "var(--ink)", letterSpacing: "-0.01em" }}>
          Transcript Analytics
        </strong>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "1rem" }}>
          <Segmented
            label="view"
            value={view}
            onChange={(v) => setView(v as View)}
            options={[
              { value: "transcript", label: "transcript", icon: ScrollText },
              { value: "analytics", label: "analytics", icon: BarChart3 },
            ]}
          />
          <button
            type="button"
            className="navctl sq theme-btn"
            aria-label="toggle theme"
            title="toggle theme"
            onClick={() => setDark((v) => !v)}
          >
            <span className="i-moon"><Moon size={16} aria-hidden /></span>
            <span className="i-sun"><Sun size={16} aria-hidden /></span>
          </button>
          {view === "transcript" && (
            <>
              <Switch checked={canLabel} onChange={setCanLabel} label="canlabel" />
              <Switch checked={canEdit} onChange={setCanEdit} label="canedit" />
            </>
          )}
        </div>
      </header>

      {view === "analytics" ? (
        <div style={{ flex: 1, minHeight: 0, overflow: "auto", padding: "1.5rem" }}>
          <ProjectOverview
            payload={{ sessions: sampleSessions }}
            title="collective pulse"
            subtitle={`${sampleSessions.length} sessions · generated fixture`}
            contributorLimit={10}
            renderContributor={(row) => <span style={{ fontWeight: 600 }}>{row.contributorId}</span>}
          />
        </div>
      ) : (
        // Bounded host: the composite's `.txn-app` is height:100% of this, so the
        // trace scrolls internally and the scrubber + keybind hint reveal.
        <div style={{ flex: 1, minHeight: 0 }}>
          <TranscriptViewer
            viewModel={vm}
            theme={dark ? "dark" : "light"}
            openTools={openTools}
            onOpenToolsChange={setOpenTools}
            capabilities={{
              canEdit,
              canLabel,
              canContribute: true,
              canChangeVisibility: false,
              canExport: true,
            }}
            callbacks={{
              onEdit: () => alert("Host would open its edit dialog"),
              onLabel: (turnIndex: number) => alert(`Host would label turn #${turnIndex}`),
              onContribute: () => alert("Host would open its contribute/share flow"),
              onCopyLink: () => alert("Host copied a link"),
              onExport: (format: string) => alert(`Host would export as ${format}`),
            }}
            graphSlot={() => (
              <TrajectoryGraph
                turns={turns}
                toolVMsByTurn={toolVMsByTurn}
                filteredTurns={turns}
                phases={samplePhases}
                annotations={graphAnnotations}
                searchMatches={[]}
                provider={HARNESS}
              />
            )}
          />
        </div>
      )}
    </div>
  );
}

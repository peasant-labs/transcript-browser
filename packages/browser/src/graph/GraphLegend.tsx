import { cn } from "../internal/cn.js";
import { GraphLegend as FairtradeGraphLegend } from "@peasant-labs/fairtrade/ui";
import { providerLabel } from "../lib/provider.js";
import type { Provider } from "@peasant-labs/types";

export interface GraphLegendProps {
  /** Provider — sets the assistant swatch accent + label to match the turn cards. */
  provider?: Provider;
  className?: string;
}

/**
 * Trajectory-graph legend — a thin ENGINE-side wrapper over fairtrade's exported
 * `GraphLegend` (the accent-swatch key). It maps the host's provider into the
 * fairtrade legend `items` so the assistant swatch + label match the provider
 * used on the turn cards, and passes the `.tb-graph-legend` overlay class through
 * `className` for positioning (fairtrade owns the swatch layout + typography).
 * The canonical set is you / agent / subagent / tool / error — matching the
 * mockup legend (no separate system entry).
 */
export function GraphLegend({ provider, className }: GraphLegendProps) {
  const agentLabel = (provider && providerLabel(provider)) || "agent";
  return (
    <FairtradeGraphLegend
      className={cn("tb-graph-legend", className)}
      items={[
        { kind: "user", label: "you" },
        { kind: "assistant", label: agentLabel, provider },
        { kind: "subagent", label: "subagent" },
        { kind: "tool", label: "tool" },
        { kind: "error", label: "error" },
      ]}
    />
  );
}

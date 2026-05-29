import { cn } from "../internal/cn.js";
import { RoleGlyph } from "../primitives/RoleGlyph.js";
import { ProviderIcon } from "../primitives/ProviderIcon.js";
import { providerLabel } from "../lib/provider.js";
import type { Provider } from "@peasant-labs/types";

export interface GraphLegendProps {
  /** Provider — used to render the agent glyph and label. */
  provider?: Provider;
  className?: string;
}

/**
 * Tiny legend explaining the rail glyphs. The "Agent" entry uses the actual
 * provider icon to match what's rendered on the rail. Ported from peasant's
 * `graph/GraphLegend.tsx`.
 */
export function GraphLegend({ provider, className }: GraphLegendProps) {
  const agentLabel = provider ? providerLabel(provider) || "Agent" : "Agent";
  return (
    <div className={cn("tb-graph-legend", className)}>
      <span className="tb-graph-legend-item">
        <RoleGlyph role="user" size={9} className="tb-toolicon-muted" />
        <span>You</span>
      </span>
      <span className="tb-graph-legend-item">
        {provider ? (
          <ProviderIcon provider={provider} size={9} tone="current" className="tb-toolicon-muted" />
        ) : (
          <RoleGlyph role="assistant" size={9} className="tb-toolicon-muted" />
        )}
        <span>{agentLabel}</span>
      </span>
      <span className="tb-graph-legend-item">
        <RoleGlyph role="subagent" size={9} className="tb-toolicon-muted" />
        <span>Subagent</span>
      </span>
      <span className="tb-graph-legend-item">
        <RoleGlyph role="tool" size={9} className="tb-toolicon-muted" />
        <span>Tool</span>
      </span>
      <span className="tb-graph-legend-item">
        <RoleGlyph role="system" size={9} className="tb-toolicon-muted" />
        <span>System</span>
      </span>
      <span className="tb-graph-legend-item tb-graph-legend-error">
        <span className="tb-graph-legend-diamond" aria-hidden />
        <span>Error</span>
      </span>
    </div>
  );
}

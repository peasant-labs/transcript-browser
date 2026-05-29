import type { ReactNode } from "react";
import { Maximize2, Minus, Plus, RotateCcw } from "lucide-react";
import { useReactFlow } from "@xyflow/react";
import { cn } from "../internal/cn.js";

export interface GraphControlsProps {
  className?: string;
}

/**
 * Monochrome zoom / fit / reset controls — replaces React Flow's default
 * Controls component. Ported from peasant's `graph/GraphControls.tsx`.
 */
export function GraphControls({ className }: GraphControlsProps) {
  const rf = useReactFlow();
  return (
    <div className={cn("tb-graph-controls", className)}>
      <Btn label="Zoom in" onClick={() => rf.zoomIn({ duration: 150 })}>
        <Plus size={12} strokeWidth={2} />
      </Btn>
      <Btn label="Zoom out" onClick={() => rf.zoomOut({ duration: 150 })}>
        <Minus size={12} strokeWidth={2} />
      </Btn>
      <Btn label="Fit view" onClick={() => rf.fitView({ padding: 0.1, duration: 250 })}>
        <Maximize2 size={11} strokeWidth={1.75} />
      </Btn>
      <Btn label="Reset" onClick={() => rf.setViewport({ x: 0, y: 0, zoom: 1 }, { duration: 200 })}>
        <RotateCcw size={11} strokeWidth={1.75} />
      </Btn>
    </div>
  );
}

function Btn({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="tb-graph-controls-btn tb-focus"
    >
      {children}
    </button>
  );
}

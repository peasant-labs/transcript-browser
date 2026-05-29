import type { ReactNode } from "react";
import { List, Workflow } from "lucide-react";
import { cn } from "../internal/cn.js";

export type TrajectoryMode = "list" | "graph";

export interface ViewModeToggleProps {
  value: TrajectoryMode;
  onChange: (v: TrajectoryMode) => void;
  className?: string;
}

/**
 * Monochrome toggle that switches the trace view between the linear list canvas
 * and the trajectory graph. Ported from peasant's `canvas/ViewModeToggle.tsx`.
 */
export function ViewModeToggle({ value, onChange, className }: ViewModeToggleProps) {
  return (
    <div role="tablist" aria-label="Trajectory view mode" className={cn("tb-segmented", className)}>
      <Btn active={value === "list"} onClick={() => onChange("list")} icon={<List size={12} strokeWidth={1.75} />} label="List" />
      <Btn active={value === "graph"} onClick={() => onChange("graph")} icon={<Workflow size={12} strokeWidth={1.75} />} label="Graph" />
    </div>
  );
}

function Btn({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: ReactNode; label: string }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn("tb-segmented-btn tb-segmented-btn-icon tb-focus", active && "tb-segmented-btn-active")}
    >
      {icon}
      {label}
    </button>
  );
}

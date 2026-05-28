import { cn } from "../internal/cn.js";
import { phaseLabel } from "../lib/phase.js";
import type { Phase } from "@peasant-labs/types";

export interface PhaseDividerProps {
  phase: Phase;
  index: number;
  active?: boolean;
  onClick?: (phase: Phase, index: number) => void;
  /** Sticky offset from the viewport top, in px. */
  stickyTop?: number;
  className?: string;
}

/**
 * Phase section header. Rendered as the first child of a per-phase `<section>`,
 * so `position: sticky` pins it for exactly as long as a turn of its phase is
 * on screen — the browser hands the pinned slot to the next phase's header
 * automatically. No JS scroll math.
 */
export function PhaseDivider({
  phase,
  index,
  active,
  onClick,
  stickyTop = 0,
  className,
}: PhaseDividerProps) {
  const label = phaseLabel(phase.type);
  return (
    <div style={{ top: stickyTop }} className={cn("tb-phase", className)}>
      <button
        type="button"
        onClick={() => onClick?.(phase, index)}
        data-phase-index={index}
        className="tb-phase-btn tb-focus"
        title={`Jump to where ${label} begins`}
      >
        <span
          className={cn("tb-eyebrow tb-phase-label", active && "tb-phase-label-active")}
        >
          {label}
        </span>
        <span className="tb-phase-range">
          turns {phase.startTurn + 1}–{phase.endTurn + 1}
        </span>
      </button>
    </div>
  );
}

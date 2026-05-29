import type { ReactNode } from "react";
import { cn } from "../internal/cn.js";

export interface StatCardProps {
  /** Small-caps eyebrow label. */
  label: string;
  /** Headline value (already formatted by the caller). */
  value: ReactNode;
  /** Optional sub-line under the value (e.g. "of 128 sessions"). */
  hint?: ReactNode;
  className?: string;
}

/**
 * A single headline metric tile. Pure presentation — the caller formats the
 * value. Paints entirely from `--tb-*` tokens.
 */
export function StatCard({ label, value, hint, className }: StatCardProps) {
  return (
    <div className={cn("tb-a-stat", className)}>
      <div className="tb-a-stat__label">{label}</div>
      <div className="tb-a-stat__value tb-a-tnum">{value}</div>
      {hint != null ? <div className="tb-a-stat__hint">{hint}</div> : null}
    </div>
  );
}

import type { ReactNode } from "react";
import { cn } from "./cn.js";

interface TooltipProps {
  /** The element that triggers the tooltip on hover / focus. */
  children: ReactNode;
  /** Tooltip content. When absent, the trigger renders unwrapped. */
  content?: ReactNode;
  className?: string;
}

/**
 * Dependency-free hover/focus tooltip.
 *
 * The source app used Radix UI (`@/components/ui/tooltip`), which couples the
 * viewer to a specific UI kit. To keep the package framework-agnostic this is
 * a pure CSS tooltip: the content is rendered into an absolutely-positioned
 * bubble that the `.tb-tooltip-host` styles reveal on `:hover`/`:focus-within`.
 * No portals, no JS positioning, no extra runtime dependency.
 */
export function Tooltip({ children, content, className }: TooltipProps) {
  if (content == null) return <>{children}</>;
  return (
    <span className={cn("tb-tooltip-host", className)}>
      {children}
      <span role="tooltip" className="tb-tooltip-bubble">
        {content}
      </span>
    </span>
  );
}

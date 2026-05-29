import * as React from "react";
import { cn } from "../internal/cn.js";

/**
 * shadcn-style tooltip, ported from the village viewer redesign (Radix
 * `Tooltip.{Provider,Root,Trigger,Content}`). To keep the package free of a
 * UI-kit/portal dependency this is a dependency-free CSS-driven reimplementation
 * that preserves the same four-part composition API:
 *
 *   <Tooltip>
 *     <TooltipTrigger>…</TooltipTrigger>
 *     <TooltipContent>tip</TooltipContent>
 *   </Tooltip>
 *
 * `TooltipProvider` is accepted for API compatibility but is a no-op pass-through
 * (delay is handled by CSS hover). The bubble is revealed on
 * `:hover`/`:focus-within` of the host (see `.tb-ui-tooltip*` in `styles.css`),
 * matching the redesign's inverse (`bg-mark`/`text-mark-fg`) treatment via
 * `--tb-ink`/`--tb-canvas`. The `side` prop positions the bubble; no JS
 * positioning, no portal.
 */
type TooltipSide = "top" | "bottom" | "left" | "right";

interface TooltipContextValue {
  side: TooltipSide;
}

const TooltipContext = React.createContext<TooltipContextValue>({ side: "top" });

export interface TooltipProviderProps {
  children?: React.ReactNode;
  /** Accepted for API parity with the source; CSS handles reveal timing. */
  delayDuration?: number;
}

export function TooltipProvider({ children }: TooltipProviderProps) {
  return <>{children}</>;
}

export interface TooltipProps extends React.ComponentProps<"span"> {
  /** Which side the bubble appears on. Defaults to "top". */
  side?: TooltipSide;
}

export function Tooltip({
  side = "top",
  className,
  children,
  ...props
}: TooltipProps) {
  const value = React.useMemo<TooltipContextValue>(() => ({ side }), [side]);
  return (
    <TooltipContext.Provider value={value}>
      <span
        data-slot="tooltip"
        className={cn("tb-ui-tooltip-host", className)}
        {...props}
      >
        {children}
      </span>
    </TooltipContext.Provider>
  );
}

export interface TooltipTriggerProps extends React.ComponentProps<"span"> {}

export function TooltipTrigger({
  className,
  children,
  ...props
}: TooltipTriggerProps) {
  return (
    <span
      data-slot="tooltip-trigger"
      tabIndex={0}
      className={cn("tb-ui-tooltip-trigger", className)}
      {...props}
    >
      {children}
    </span>
  );
}

export interface TooltipContentProps extends React.ComponentProps<"span"> {}

export function TooltipContent({
  className,
  children,
  ...props
}: TooltipContentProps) {
  const { side } = React.useContext(TooltipContext);
  return (
    <span
      role="tooltip"
      data-slot="tooltip-content"
      data-side={side}
      className={cn("tb-ui-tooltip-content", `tb-ui-tooltip-${side}`, className)}
      {...props}
    >
      {children}
    </span>
  );
}

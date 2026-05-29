import * as React from "react";
import { cn } from "../internal/cn.js";

/**
 * shadcn-style popover, ported from the village viewer redesign (Radix
 * `Popover.{Root,Trigger,Content}` + a Portal). To keep the package
 * dependency-free this is a self-contained reimplementation that mirrors the
 * package's existing dropdown pattern (`ActionMenu`): an absolutely-positioned
 * panel anchored to the trigger, with outside-click + Escape dismissal. The same
 * three-part API is preserved:
 *
 *   <Popover open={…} onOpenChange={…}>   // or uncontrolled via defaultOpen
 *     <PopoverTrigger>…</PopoverTrigger>
 *     <PopoverContent align="end">…</PopoverContent>
 *   </Popover>
 *
 * No Radix, no portal. `align` ("start" | "center" | "end") positions the panel
 * horizontally relative to the trigger; styling maps to `.tb-ui-popover*` in
 * `styles.css` (`bg-surface`, `border-rule`).
 */
type PopoverAlign = "start" | "center" | "end";

interface PopoverContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
  hostRef: React.RefObject<HTMLDivElement | null>;
}

const PopoverContext = React.createContext<PopoverContextValue | null>(null);

function usePopover(component: string): PopoverContextValue {
  const ctx = React.useContext(PopoverContext);
  if (!ctx) throw new Error(`<${component}> must be used inside <Popover>`);
  return ctx;
}

export interface PopoverProps extends Omit<React.ComponentProps<"div">, "onChange"> {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function Popover({
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  className,
  children,
  ...props
}: PopoverProps) {
  const [openState, setOpenState] = React.useState(defaultOpen);
  const isControlled = openProp != null;
  const open = isControlled ? openProp : openState;
  const hostRef = React.useRef<HTMLDivElement>(null);

  const setOpen = React.useCallback(
    (next: boolean) => {
      if (!isControlled) setOpenState(next);
      onOpenChange?.(next);
    },
    [isControlled, onOpenChange],
  );

  React.useEffect(() => {
    if (!open) return;
    function onDocPointerDown(e: PointerEvent) {
      if (!hostRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onDocPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onDocPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, setOpen]);

  const value = React.useMemo<PopoverContextValue>(
    () => ({ open, setOpen, hostRef }),
    [open, setOpen],
  );

  return (
    <PopoverContext.Provider value={value}>
      <div
        ref={hostRef}
        data-slot="popover"
        data-state={open ? "open" : "closed"}
        className={cn("tb-ui-popover-host", className)}
        {...props}
      >
        {children}
      </div>
    </PopoverContext.Provider>
  );
}

export interface PopoverTriggerProps extends React.ComponentProps<"button"> {}

export function PopoverTrigger({
  onClick,
  children,
  ...props
}: PopoverTriggerProps) {
  const { open, setOpen } = usePopover("PopoverTrigger");
  return (
    <button
      type="button"
      data-slot="popover-trigger"
      aria-expanded={open}
      aria-haspopup="dialog"
      onClick={(e) => {
        onClick?.(e);
        if (!e.defaultPrevented) setOpen(!open);
      }}
      {...props}
    >
      {children}
    </button>
  );
}

export interface PopoverContentProps extends React.ComponentProps<"div"> {
  align?: PopoverAlign;
}

export function PopoverContent({
  align = "center",
  className,
  children,
  ...props
}: PopoverContentProps) {
  const { open } = usePopover("PopoverContent");
  if (!open) return null;
  return (
    <div
      role="dialog"
      data-slot="popover-content"
      data-align={align}
      data-state="open"
      className={cn("tb-ui-popover-content", `tb-ui-popover-${align}`, className)}
      {...props}
    >
      {children}
    </div>
  );
}

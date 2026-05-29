import * as React from "react";

/**
 * shadcn-style collapsible, ported from the village viewer redesign (which
 * re-exported Radix `Collapsible.{Root,Trigger,Content}`). This is a
 * dependency-free reimplementation with the same three-part API:
 *
 *   <Collapsible open={…} onOpenChange={…}>   // or uncontrolled via defaultOpen
 *     <CollapsibleTrigger>…</CollapsibleTrigger>
 *     <CollapsibleContent>…</CollapsibleContent>
 *   </Collapsible>
 *
 * Both controlled (`open` + `onOpenChange`) and uncontrolled (`defaultOpen`)
 * usage are supported. The trigger forwards `aria-expanded` / `data-state`; the
 * content is unmounted when closed (matching Radix's default, non-`forceMount`
 * behaviour). No Radix, no portal, no animation dependency.
 */
interface CollapsibleContextValue {
  open: boolean;
  toggle: () => void;
  disabled: boolean;
}

const CollapsibleContext = React.createContext<CollapsibleContextValue | null>(
  null,
);

function useCollapsible(component: string): CollapsibleContextValue {
  const ctx = React.useContext(CollapsibleContext);
  if (!ctx) {
    throw new Error(`<${component}> must be used inside <Collapsible>`);
  }
  return ctx;
}

export interface CollapsibleProps
  extends Omit<React.ComponentProps<"div">, "onChange"> {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  disabled?: boolean;
}

export function Collapsible({
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  disabled = false,
  children,
  ...props
}: CollapsibleProps) {
  const [openState, setOpenState] = React.useState(defaultOpen);
  const isControlled = openProp != null;
  const open = isControlled ? openProp : openState;

  const toggle = React.useCallback(() => {
    if (disabled) return;
    const next = !open;
    if (!isControlled) setOpenState(next);
    onOpenChange?.(next);
  }, [disabled, open, isControlled, onOpenChange]);

  const value = React.useMemo<CollapsibleContextValue>(
    () => ({ open, toggle, disabled }),
    [open, toggle, disabled],
  );

  return (
    <CollapsibleContext.Provider value={value}>
      <div
        data-slot="collapsible"
        data-state={open ? "open" : "closed"}
        {...props}
      >
        {children}
      </div>
    </CollapsibleContext.Provider>
  );
}

export interface CollapsibleTriggerProps
  extends React.ComponentProps<"button"> {}

export function CollapsibleTrigger({
  onClick,
  children,
  ...props
}: CollapsibleTriggerProps) {
  const { open, toggle, disabled } = useCollapsible("CollapsibleTrigger");
  return (
    <button
      type="button"
      data-slot="collapsible-trigger"
      data-state={open ? "open" : "closed"}
      aria-expanded={open}
      disabled={disabled}
      onClick={(e) => {
        onClick?.(e);
        if (!e.defaultPrevented) toggle();
      }}
      {...props}
    >
      {children}
    </button>
  );
}

export interface CollapsibleContentProps extends React.ComponentProps<"div"> {}

export function CollapsibleContent({
  children,
  ...props
}: CollapsibleContentProps) {
  const { open } = useCollapsible("CollapsibleContent");
  if (!open) return null;
  return (
    <div data-slot="collapsible-content" data-state="open" {...props}>
      {children}
    </div>
  );
}

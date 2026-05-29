import * as React from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "../internal/cn.js";

/**
 * shadcn-style select, ported from the village viewer redesign (Radix
 * `Select.{Root,Trigger,Value,Content,Item}` + scroll buttons + Portal). To keep
 * the package dependency-free this is a self-contained listbox reimplementation
 * following the same click-outside dropdown pattern as the package's
 * `CheckpointSelector`. The composition API mirrors the source:
 *
 *   <Select value={v} onValueChange={setV}>
 *     <SelectTrigger><SelectValue placeholder="…" /></SelectTrigger>
 *     <SelectContent>
 *       <SelectItem value="a">A</SelectItem>
 *     </SelectContent>
 *   </Select>
 *
 * `SelectValue` renders the label of the chosen `SelectItem` (collected from the
 * item children), or the `placeholder` when nothing is selected. Styling maps to
 * `.tb-ui-select*` in `styles.css` (`border-rule`, `bg-surface`,
 * `hover:bg-surface-hover`, focused-item `bg-surface-hover`). The Radix
 * scroll-up/down buttons are dropped — native overflow scrolling covers it.
 */
type SelectSize = "sm" | "default";

interface SelectItemMeta {
  value: string;
  label: React.ReactNode;
}

interface SelectContextValue {
  value: string | undefined;
  onValueChange?: (value: string) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
  hostRef: React.RefObject<HTMLDivElement | null>;
  register: (meta: SelectItemMeta) => void;
  labels: Map<string, React.ReactNode>;
  placeholder?: React.ReactNode;
  setPlaceholder: (node: React.ReactNode) => void;
}

const SelectContext = React.createContext<SelectContextValue | null>(null);

function useSelect(component: string): SelectContextValue {
  const ctx = React.useContext(SelectContext);
  if (!ctx) throw new Error(`<${component}> must be used inside <Select>`);
  return ctx;
}

export interface SelectProps {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  children?: React.ReactNode;
}

export function Select({
  value: valueProp,
  defaultValue,
  onValueChange,
  children,
}: SelectProps) {
  const [valueState, setValueState] = React.useState<string | undefined>(
    defaultValue,
  );
  const isControlled = valueProp !== undefined;
  const value = isControlled ? valueProp : valueState;

  const [open, setOpen] = React.useState(false);
  const hostRef = React.useRef<HTMLDivElement>(null);
  // Item value -> label, so <SelectValue> can render the chosen label.
  const labelsRef = React.useRef(new Map<string, React.ReactNode>());
  const [, force] = React.useReducer((n: number) => n + 1, 0);
  const [placeholder, setPlaceholder] = React.useState<React.ReactNode>();

  const handleValueChange = React.useCallback(
    (next: string) => {
      if (!isControlled) setValueState(next);
      onValueChange?.(next);
      setOpen(false);
    },
    [isControlled, onValueChange],
  );

  const register = React.useCallback((meta: SelectItemMeta) => {
    const prev = labelsRef.current.get(meta.value);
    if (prev !== meta.label) {
      labelsRef.current.set(meta.value, meta.label);
      force();
    }
  }, []);

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
  }, [open]);

  const ctx = React.useMemo<SelectContextValue>(
    () => ({
      value,
      onValueChange: handleValueChange,
      open,
      setOpen,
      hostRef,
      register,
      labels: labelsRef.current,
      placeholder,
      setPlaceholder,
    }),
    [value, handleValueChange, open, register, placeholder],
  );

  return (
    <SelectContext.Provider value={ctx}>
      <div ref={hostRef} data-slot="select" className="tb-ui-select-host">
        {children}
      </div>
    </SelectContext.Provider>
  );
}

export interface SelectTriggerProps extends React.ComponentProps<"button"> {
  size?: SelectSize;
}

export function SelectTrigger({
  size = "default",
  className,
  children,
  onClick,
  ...props
}: SelectTriggerProps) {
  const { open, setOpen } = useSelect("SelectTrigger");
  return (
    <button
      type="button"
      data-slot="select-trigger"
      data-size={size}
      aria-haspopup="listbox"
      aria-expanded={open}
      className={cn("tb-ui-select-trigger tb-focus", className)}
      onClick={(e) => {
        onClick?.(e);
        if (!e.defaultPrevented) setOpen(!open);
      }}
      {...props}
    >
      {children}
      <ChevronDown size={16} strokeWidth={2} className="tb-ui-select-caret" />
    </button>
  );
}

export interface SelectValueProps {
  placeholder?: React.ReactNode;
  className?: string;
}

export function SelectValue({ placeholder, className }: SelectValueProps) {
  const { value, labels, setPlaceholder } = useSelect("SelectValue");
  React.useEffect(() => {
    setPlaceholder(placeholder);
  }, [placeholder, setPlaceholder]);
  const selectedLabel = value != null ? labels.get(value) : undefined;
  const isPlaceholder = selectedLabel == null;
  return (
    <span
      data-slot="select-value"
      data-placeholder={isPlaceholder ? "" : undefined}
      className={cn("tb-ui-select-value", className)}
    >
      {isPlaceholder ? placeholder : selectedLabel}
    </span>
  );
}

export interface SelectContentProps extends React.ComponentProps<"div"> {}

export function SelectContent({
  className,
  children,
  ...props
}: SelectContentProps) {
  const { open } = useSelect("SelectContent");
  if (!open) return null;
  return (
    <div
      role="listbox"
      data-slot="select-content"
      data-state="open"
      className={cn("tb-ui-select-content", className)}
      {...props}
    >
      {children}
    </div>
  );
}

export interface SelectItemProps
  extends Omit<React.ComponentProps<"div">, "onSelect"> {
  value: string;
}

export function SelectItem({
  value,
  className,
  children,
  ...props
}: SelectItemProps) {
  const ctx = useSelect("SelectItem");
  React.useEffect(() => {
    ctx.register({ value, label: children });
  }, [ctx, value, children]);
  const selected = ctx.value === value;
  return (
    <div
      role="option"
      data-slot="select-item"
      aria-selected={selected}
      data-state={selected ? "checked" : "unchecked"}
      tabIndex={0}
      className={cn("tb-ui-select-item", className)}
      onClick={() => ctx.onValueChange?.(value)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          ctx.onValueChange?.(value);
        }
      }}
      {...props}
    >
      <span className="tb-ui-select-item-indicator">
        {selected && <Check size={16} strokeWidth={2.5} />}
      </span>
      <span className="tb-ui-select-item-text">{children}</span>
    </div>
  );
}

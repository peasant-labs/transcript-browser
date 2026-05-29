/**
 * `primitives` UI surface — shadcn-style primitives ported from the village
 * viewer redesign and re-expressed in the package's token model.
 *
 * The redesign authored these with Tailwind utilities + village token classes
 * (`bg-mark`, `text-ink-2`, `border-rule`, `bg-danger-soft`, …) on top of Radix.
 * They are rewritten here to the package's contract: every visual is a
 * `tb-`-prefixed class backed by `--tb-*` CSS variables (see `styles.css`), the
 * CVA variant/slot/a11y API is preserved, and the Radix-backed interactive
 * primitives (checkbox, collapsible, select, tooltip, popover) are reimplemented
 * dependency-free. No Tailwind, no Radix, no village imports, no brand strings,
 * no routes, no data fetching.
 *
 * Exported under the `primitives` namespace from the package root:
 *   import { primitives } from "@peasant-labs/transcript-browser";
 *   const { Button, Badge, Select } = primitives;
 */
export { Badge, type BadgeProps, type BadgeVariant } from "./badge.js";
export {
  Button,
  type ButtonProps,
  type ButtonVariant,
  type ButtonSize,
} from "./button.js";
export { Card, CardContent } from "./card.js";
export { Checkbox, type CheckboxProps } from "./checkbox.js";
export {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
  type CollapsibleProps,
  type CollapsibleTriggerProps,
  type CollapsibleContentProps,
} from "./collapsible.js";
export { Input } from "./input.js";
export {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  type SelectProps,
  type SelectTriggerProps,
  type SelectValueProps,
  type SelectContentProps,
  type SelectItemProps,
} from "./select.js";
export { Skeleton } from "./skeleton.js";
export {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "./table.js";
export {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
  type TooltipProps,
  type TooltipTriggerProps,
  type TooltipContentProps,
  type TooltipProviderProps,
} from "./tooltip.js";
export {
  Popover,
  PopoverTrigger,
  PopoverContent,
  type PopoverProps,
  type PopoverTriggerProps,
  type PopoverContentProps,
} from "./popover.js";

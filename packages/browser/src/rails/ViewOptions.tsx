import { Check } from "lucide-react";
import { cn } from "../internal/cn.js";
import type { V2ViewOptions } from "./filter-types.js";

export interface ViewOptionsProps {
  value: V2ViewOptions;
  onChange: (next: V2ViewOptions) => void;
}

const OPTIONS: { key: keyof V2ViewOptions; label: string; help?: string }[] = [
  { key: "showHidden", label: "Show hidden indicators", help: "Phase markers, depth labels, checkpoint dividers." },
  { key: "expandToolCalls", label: "Expand all tool calls" },
  { key: "compact", label: "Compact mode", help: "Tighter spacing between turns." },
];

/** View-option switches for the right rail. Ported from peasant's `rails/ViewOptions.tsx`. */
export function ViewOptions({ value, onChange }: ViewOptionsProps) {
  return (
    <div className="tb-viewopts">
      {OPTIONS.map((opt) => (
        <button
          type="button"
          key={opt.key}
          role="switch"
          aria-checked={value[opt.key]}
          onClick={() => onChange({ ...value, [opt.key]: !value[opt.key] })}
          title={opt.help}
          className="tb-viewopts-row tb-focus"
        >
          <span aria-hidden className={cn("tb-fcheck-box", value[opt.key] && "tb-fcheck-box-on")}>
            <Check size={9} strokeWidth={3} />
          </span>
          <span className={cn("tb-viewopts-label", value[opt.key] && "tb-viewopts-label-on")}>{opt.label}</span>
        </button>
      ))}
    </div>
  );
}

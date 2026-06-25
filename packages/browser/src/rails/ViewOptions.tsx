import { VIEW_OPTION_LABELS, VIEW_OPTION_HELP } from "../lib/labels.js";
import type { V2ViewOptions } from "./filter-types.js";

export interface ViewOptionsProps {
  value: V2ViewOptions;
  onChange: (next: V2ViewOptions) => void;
}

const OPTIONS: { key: keyof V2ViewOptions; label: string; help?: string }[] = [
  { key: "showHidden", label: VIEW_OPTION_LABELS.showHidden, help: VIEW_OPTION_HELP.showHidden },
  { key: "expandToolCalls", label: VIEW_OPTION_LABELS.expandToolCalls },
  { key: "compact", label: VIEW_OPTION_LABELS.compact, help: VIEW_OPTION_HELP.compact },
];

/**
 * View-option toggles — the canonical `.txn-viewsw` markup: a `.sw` switch
 * button + label + on/off state, lifted from the in-use demo's ViewSwitch.
 */
export function ViewOptions({ value, onChange }: ViewOptionsProps) {
  return (
    <div className="tb-viewopts">
      {OPTIONS.map((opt) => {
        const on = value[opt.key];
        return (
          <div key={opt.key} className="txn-viewsw" title={opt.help}>
            <button
              type="button"
              role="switch"
              aria-checked={on}
              className="sw"
              aria-label={opt.label}
              onClick={() => onChange({ ...value, [opt.key]: !on })}
            />
            <span className="txn-viewsw-label">{opt.label}</span>
            <span className="txn-viewsw-state">{on ? "on" : "off"}</span>
          </div>
        );
      })}
    </div>
  );
}

import type { ReactNode } from "react";
import { cn } from "../internal/cn.js";
import { SessionTab, type SessionTabDef } from "../session-detail-types.js";

export interface TabStripProps {
  tabs: SessionTabDef[];
  value: SessionTab;
  onChange: (tab: SessionTab) => void;
  className?: string;
  rightSlot?: ReactNode;
}

/**
 * Session tab strip — the canonical `.txn-tabs` markup. The active tab is
 * emphasised with the design system's thin amber underline (CSS, via
 * `.txn-tab.active`); inactive tabs read faded. Each tab carries its count in a
 * `.cnt` tnum span. (No leading marker / amber text — that affordance belongs to
 * the demo's outer nav, not the session tabs.)
 */
export function TabStrip({ tabs, value, onChange, className, rightSlot }: TabStripProps) {
  return (
    <div className={cn("tabs txn-tabs", className)} role="tablist" aria-label="session views">
      {tabs.map((t) => {
        const active = t.id === value;
        return (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(t.id)}
            className={cn("tab txn-tab", active && "active")}
          >
            {t.label}
            {t.count != null && <span className="cnt tnum"> {t.count.toLocaleString()}</span>}
          </button>
        );
      })}
      {rightSlot}
    </div>
  );
}

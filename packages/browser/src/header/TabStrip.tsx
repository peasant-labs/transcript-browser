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
 * Underline-style tab strip. Active tab has a 2px ink underline; inactive tabs
 * are quiet ink-3. Ported from peasant's `header/TabStrip.tsx`.
 */
export function TabStrip({ tabs, value, onChange, className, rightSlot }: TabStripProps) {
  return (
    <div className={cn("tb-tabstrip", className)} role="tablist">
      <div className="tb-tabstrip-tabs">
        {tabs.map((t) => {
          const active = t.id === value;
          return (
            <button
              key={t.id}
              role="tab"
              aria-selected={active}
              onClick={() => onChange(t.id)}
              className={cn("tb-tabstrip-tab tb-focus", active && "tb-tabstrip-tab-active")}
            >
              <span>{t.label}</span>
              {t.count != null && (
                <span className={cn("tb-tabstrip-count tb-tnum", active && "tb-tabstrip-count-active")}>{t.count.toLocaleString()}</span>
              )}
            </button>
          );
        })}
      </div>
      {rightSlot && <div className="tb-tabstrip-right">{rightSlot}</div>}
    </div>
  );
}

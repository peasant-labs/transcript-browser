import { useState, type ReactNode } from "react";
import { ChevronRight } from "@peasant-labs/fairtrade/icons";
import { cn } from "../internal/cn.js";

export interface FilterSectionProps {
  title: string;
  /** Optional small action shown right of the title (e.g. "Clear"). */
  action?: ReactNode;
  /** Whether the section starts open. */
  defaultOpen?: boolean;
  /** When true, no expand/collapse toggle; the title is static. */
  static?: boolean;
  children: ReactNode;
  className?: string;
}

/**
 * Vertical section block in the right rail. Ported from peasant's
 * `rails/FilterSection.tsx`.
 */
export function FilterSection({
  title,
  action,
  defaultOpen = true,
  static: staticTitle = false,
  children,
  className,
}: FilterSectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className={cn("tb-fsection", className)}>
      <header className="tb-fsection-head">
        {staticTitle ? (
          <span className="tb-eyebrow">{title}</span>
        ) : (
          <button type="button" onClick={() => setOpen((v) => !v)} className="tb-fsection-toggle" aria-expanded={open}>
            <ChevronRight size={11} strokeWidth={2} className={cn("tb-fsection-chevron", open && "tb-chevron-open")} />
            <span className="tb-eyebrow">{title}</span>
          </button>
        )}
        {action}
      </header>
      {open && <div className="tb-fsection-body">{children}</div>}
    </section>
  );
}

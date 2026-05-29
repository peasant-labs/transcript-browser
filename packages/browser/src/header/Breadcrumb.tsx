import { Fragment } from "react";
import { cn } from "../internal/cn.js";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

/**
 * Monochrome breadcrumb with a literal " / " separator. The last item renders
 * as plain ink; everything before is a quiet link. Ported from peasant's
 * `header/Breadcrumb.tsx`; the Next.js `<Link>` is replaced with a plain `<a>`
 * (the host supplies fully-formed hrefs — no router coupling).
 */
export function Breadcrumb({ items, className }: BreadcrumbProps) {
  return (
    <nav aria-label="Breadcrumb" className={cn("tb-breadcrumb", className)}>
      {items.map((item, i) => {
        const isLast = i === items.length - 1;
        const node =
          isLast || !item.href ? (
            <span className={cn("tb-truncate", isLast ? "tb-breadcrumb-current" : "tb-breadcrumb-link")} title={item.label}>
              {item.label}
            </span>
          ) : (
            <a href={item.href} className="tb-breadcrumb-link tb-truncate" title={item.label}>
              {item.label}
            </a>
          );

        return (
          <Fragment key={i}>
            {i > 0 && <span className="tb-breadcrumb-sep" aria-hidden>/</span>}
            {node}
          </Fragment>
        );
      })}
    </nav>
  );
}

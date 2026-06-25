import { Breadcrumb as FairtradeBreadcrumb } from "@peasant-labs/fairtrade/ui";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

/**
 * Breadcrumb — consumes the design system's Breadcrumb (ChevronRight
 * separators, current-page styling). The host supplies fully-formed hrefs (no
 * router coupling). The optional `className` is kept as a layout wrapper so call
 * sites can position the crumb without the bespoke breadcrumb chrome.
 */
export function Breadcrumb({ items, className }: BreadcrumbProps) {
  const crumb = <FairtradeBreadcrumb items={items} />;
  return className ? <div className={className}>{crumb}</div> : crumb;
}

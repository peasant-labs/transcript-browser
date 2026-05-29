import * as React from "react";
import { cn } from "../internal/cn.js";

/**
 * shadcn-style table set, ported from the village viewer redesign. The
 * redesign's Tailwind classes (`bg-surface`, `border-rule`, `hover:bg-surface-hover`,
 * `text-ink-3`, the `[&_tr]:border-b` descendant selectors, sizing) are folded
 * into `tb-`-prefixed classes in `styles.css`; the descendant/`:last-child`
 * border rules that Tailwind expressed inline are plain CSS there.
 */
export function Table({ className, ...props }: React.ComponentProps<"table">) {
  return (
    <div data-slot="table-container" className="tb-ui-table-container">
      <table
        data-slot="table"
        className={cn("tb-ui-table", className)}
        {...props}
      />
    </div>
  );
}

export function TableHeader({
  className,
  ...props
}: React.ComponentProps<"thead">) {
  return (
    <thead
      data-slot="table-header"
      className={cn("tb-ui-table-header", className)}
      {...props}
    />
  );
}

export function TableBody({
  className,
  ...props
}: React.ComponentProps<"tbody">) {
  return (
    <tbody
      data-slot="table-body"
      className={cn("tb-ui-table-body", className)}
      {...props}
    />
  );
}

export function TableRow({ className, ...props }: React.ComponentProps<"tr">) {
  return (
    <tr
      data-slot="table-row"
      className={cn("tb-ui-table-row", className)}
      {...props}
    />
  );
}

export function TableHead({ className, ...props }: React.ComponentProps<"th">) {
  return (
    <th
      data-slot="table-head"
      className={cn("tb-ui-table-head", className)}
      {...props}
    />
  );
}

export function TableCell({ className, ...props }: React.ComponentProps<"td">) {
  return (
    <td
      data-slot="table-cell"
      className={cn("tb-ui-table-cell", className)}
      {...props}
    />
  );
}

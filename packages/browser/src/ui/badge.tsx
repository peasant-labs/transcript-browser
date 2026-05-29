import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../internal/cn.js";

/**
 * shadcn-style badge, ported from the village viewer redesign and re-expressed
 * in the package's token model. The redesign painted with Tailwind utilities +
 * village token classes (`bg-mark`, `text-ink-2`, `border-rule`, `bg-danger-soft`,
 * …); here every variant is a single `tb-`-prefixed class backed by `--tb-*`
 * variables (see `styles.css` `.tb-ui-badge*`). No Tailwind, no `asChild`/Radix
 * Slot — a plain `<span>` keeps the package dependency-free while preserving the
 * CVA variant API and a11y surface.
 */
const badgeVariants = cva("tb-ui-badge", {
  variants: {
    variant: {
      default: "tb-ui-badge-default",
      secondary: "tb-ui-badge-secondary",
      destructive: "tb-ui-badge-destructive",
      outline: "tb-ui-badge-outline",
      ghost: "tb-ui-badge-ghost",
      link: "tb-ui-badge-link",
    },
  },
  defaultVariants: {
    variant: "default",
  },
});

export type BadgeVariant = NonNullable<
  VariantProps<typeof badgeVariants>["variant"]
>;

export interface BadgeProps
  extends React.ComponentProps<"span">,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <span
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  );
}

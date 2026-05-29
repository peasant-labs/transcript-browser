import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../internal/cn.js";

/**
 * shadcn-style button, ported from the village viewer redesign. The redesign's
 * Tailwind/village classes (`bg-mark`/`text-mark-fg`, `bg-danger`, `border-rule`,
 * `hover:bg-surface-hover`, the `h-9 px-4` sizing utilities, `focus-mono`) are
 * mapped onto `tb-`-prefixed classes backed by `--tb-*` tokens — the base
 * `.tb-ui-btn` plus a variant and size class (see `styles.css`). The CVA
 * variant/size API is preserved; the Radix `Slot`/`asChild` escape hatch is
 * dropped so the package stays free of a UI-kit dependency.
 */
const buttonVariants = cva("tb-ui-btn tb-focus", {
  variants: {
    variant: {
      default: "tb-ui-btn-default",
      destructive: "tb-ui-btn-destructive",
      outline: "tb-ui-btn-outline",
      secondary: "tb-ui-btn-secondary",
      ghost: "tb-ui-btn-ghost",
      link: "tb-ui-btn-link",
    },
    size: {
      default: "tb-ui-btn-size-default",
      xs: "tb-ui-btn-size-xs",
      sm: "tb-ui-btn-size-sm",
      lg: "tb-ui-btn-size-lg",
      icon: "tb-ui-btn-size-icon",
      "icon-xs": "tb-ui-btn-size-icon-xs",
      "icon-sm": "tb-ui-btn-size-icon-sm",
      "icon-lg": "tb-ui-btn-size-icon-lg",
    },
  },
  defaultVariants: {
    variant: "default",
    size: "default",
  },
});

export type ButtonVariant = NonNullable<
  VariantProps<typeof buttonVariants>["variant"]
>;
export type ButtonSize = NonNullable<
  VariantProps<typeof buttonVariants>["size"]
>;

export interface ButtonProps
  extends React.ComponentProps<"button">,
    VariantProps<typeof buttonVariants> {}

export function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonProps) {
  return (
    <button
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}

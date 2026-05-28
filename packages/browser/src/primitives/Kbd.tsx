import type { ReactNode } from "react";
import { cn } from "../internal/cn.js";

export interface KbdProps {
  children: ReactNode;
  className?: string;
}

/** Keyboard key shown inline (e.g. ⌘F, ⎋, [, ]). Monospace, hairline border. */
export function Kbd({ children, className }: KbdProps) {
  return <kbd className={cn("tb-kbd", className)}>{children}</kbd>;
}

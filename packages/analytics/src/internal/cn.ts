import { type ClassValue, clsx } from "clsx";

/**
 * Conditional className joiner. The analytics layer ships its own
 * self-contained, `tb-`-prefixed stylesheet (no Tailwind in the consuming app),
 * so plain `clsx` is sufficient — every class is authored here and never
 * collides.
 */
export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}

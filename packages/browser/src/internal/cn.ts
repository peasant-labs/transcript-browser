import { type ClassValue, clsx } from "clsx";

/**
 * Conditional className joiner. The viewer ships its own self-contained,
 * `tb-`-prefixed stylesheet (no Tailwind dependency in the consuming app), so
 * unlike the source app there is no `tailwind-merge` step — every class is
 * authored by us and never collides, so plain `clsx` is sufficient.
 */
export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}

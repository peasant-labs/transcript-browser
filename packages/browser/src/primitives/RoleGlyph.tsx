import { cn } from "../internal/cn.js";
import type { Role } from "@peasant-labs/schema";

/**
 * Monochrome role indicator used on the transcript rail.
 * No fills, no chroma — shape carries the meaning.
 *
 *   user      filled circle  ●
 *   assistant outlined ring  ○
 *   tool      hairline corner └
 *   system    filled square  ◼
 *   subagent  nested dot (small ring around small dot)
 */
export type GlyphRole = Role | "subagent";

export interface RoleGlyphProps {
  role: GlyphRole;
  size?: number;
  className?: string;
}

export function RoleGlyph({ role, size = 14, className }: RoleGlyphProps) {
  // The user glyph is role-tinted; tool / system / subagent stay monochrome.
  const baseCls = cn("tb-glyph", role === "user" && "tb-glyph-user", className);
  const s = size;

  switch (role) {
    case "user":
      return (
        <svg width={s} height={s} viewBox="0 0 14 14" fill="none" aria-hidden className={baseCls}>
          <circle cx="7" cy="7" r="4" fill="currentColor" />
        </svg>
      );
    case "assistant":
      return (
        <svg width={s} height={s} viewBox="0 0 14 14" fill="none" aria-hidden className={baseCls}>
          <circle cx="7" cy="7" r="3.5" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      );
    case "tool":
      return (
        <svg width={s} height={s} viewBox="0 0 14 14" fill="none" aria-hidden className={baseCls}>
          <path
            d="M3 3v6a2 2 0 0 0 2 2h6"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="square"
          />
        </svg>
      );
    case "system":
      return (
        <svg width={s} height={s} viewBox="0 0 14 14" fill="none" aria-hidden className={baseCls}>
          <rect x="3.5" y="3.5" width="7" height="7" fill="currentColor" />
        </svg>
      );
    case "subagent":
      return (
        <svg width={s} height={s} viewBox="0 0 14 14" fill="none" aria-hidden className={baseCls}>
          <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1" opacity="0.55" />
          <circle cx="7" cy="7" r="2.5" fill="currentColor" />
        </svg>
      );
  }
}

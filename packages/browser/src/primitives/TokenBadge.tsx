import { cn } from "../internal/cn.js";

/**
 * Format a token count with k/M suffixes; uses tabular figures everywhere.
 * 1234 → "1,234"; 12345 → "12.3k"; 1234567 → "1.23M"
 */
export function formatTokens(n: number | undefined): string {
  if (n == null || !isFinite(n) || n < 0) return "";
  if (n < 1000) return String(n);
  if (n < 100_000) return `${(n / 1000).toFixed(1)}k`;
  if (n < 1_000_000) return `${Math.round(n / 1000)}k`;
  if (n < 100_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  return `${(n / 1_000_000).toFixed(1)}M`;
}

export interface TokenBadgeProps {
  tokens?: number;
  /** Optional in/out breakdown for the native tooltip. */
  tokensIn?: number;
  tokensOut?: number;
  className?: string;
  /** When true, also append " tok" suffix. */
  withLabel?: boolean;
}

export function TokenBadge({
  tokens,
  tokensIn,
  tokensOut,
  className,
  withLabel,
}: TokenBadgeProps) {
  if (tokens == null) return null;
  const title =
    tokensIn != null && tokensOut != null
      ? `${tokensIn.toLocaleString()} in · ${tokensOut.toLocaleString()} out`
      : undefined;
  return (
    <span title={title} className={cn("tb-badge", className)}>
      {formatTokens(tokens)}
      {withLabel ? " tok" : ""}
    </span>
  );
}

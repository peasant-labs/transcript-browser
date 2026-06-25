/**
 * Human-readable duration with tabular figures. Returns the empty string for
 * null/undefined so callers can render nothing without conditionals.
 */
export function formatDuration(ms?: number): string {
  if (ms == null || !isFinite(ms) || ms < 0) return "";
  if (ms === 0) return "0ms";
  if (ms < 1000) return `${Math.round(ms)}ms`;
  const s = ms / 1000;
  if (s < 60) return `${s < 10 ? s.toFixed(1) : Math.round(s)}s`;
  const m = s / 60;
  if (m < 60) {
    const wholeM = Math.floor(m);
    const remS = Math.round(s - wholeM * 60);
    return remS > 0 ? `${wholeM}m ${remS}s` : `${wholeM}m`;
  }
  const h = Math.floor(m / 60);
  const remM = Math.floor(m - h * 60);
  return remM > 0 ? `${h}h ${remM}m` : `${h}h`;
}

/**
 * Format a token count with k/M suffixes; uses tabular figures everywhere.
 * 1234 -> "1,234"; 12345 -> "12.3k"; 1234567 -> "1.23M"
 */
export function formatTokens(n: number | undefined): string {
  if (n == null || !isFinite(n) || n < 0) return "";
  if (n < 1000) return String(n);
  if (n < 100_000) return `${(n / 1000).toFixed(1)}k`;
  if (n < 1_000_000) return `${Math.round(n / 1000)}k`;
  if (n < 100_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  return `${(n / 1_000_000).toFixed(1)}M`;
}

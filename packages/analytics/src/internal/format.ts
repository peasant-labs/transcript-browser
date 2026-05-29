/**
 * Pure presentation formatters used by the analytics components. Kept internal:
 * the public surface is the metric functions + `ProjectOverview`.
 */

/** Compact token count: 1234 → "1.2k", 1_234_567 → "1.23M". */
export function formatTokens(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n) || n < 0) return "—";
  if (n < 1000) return String(Math.round(n));
  if (n < 1_000_000) return `${(n / 1000).toFixed(1)}k`;
  return `${(n / 1_000_000).toFixed(2)}M`;
}

/** Round a number to at most 1 decimal place, dropping a trailing ".0". */
export function formatNumber(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  const r = Math.round(n * 10) / 10;
  return Number.isInteger(r) ? String(r) : r.toFixed(1);
}

/** Percentage from a [0,1] rate: 0.4231 → "42%". */
export function formatRate(rate: number | null | undefined): string {
  if (rate == null || !Number.isFinite(rate)) return "—";
  return `${Math.round(rate * 100)}%`;
}

/** Minutes → human duration: 90 → "1h 30m", 45 → "45m". */
export function formatDuration(mins: number | null | undefined): string {
  if (mins == null || !Number.isFinite(mins) || mins < 0) return "—";
  const total = Math.round(mins);
  if (total < 60) return `${total}m`;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

/** Shorten a `YYYY-MM-DD` week key to `MM-DD` for compact axis ticks. */
export function shortWeek(week: string): string {
  return week.length >= 10 ? week.slice(5) : week;
}

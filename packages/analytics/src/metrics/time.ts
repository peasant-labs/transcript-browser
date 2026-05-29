/**
 * Time-bucketing helpers shared by the week-oriented metrics.
 *
 * All bucketing is done in UTC against the date portion of `startTime`, so the
 * results are deterministic regardless of the host's timezone. A "week" is an
 * ISO week starting Monday; the bucket key is the Monday date (`YYYY-MM-DD`).
 */

/** Parse an ISO-8601 string into epoch milliseconds, or `null` if invalid. */
export function parseTime(iso: string): number | null {
  const t = Date.parse(iso);
  return Number.isNaN(t) ? null : t;
}

const MS_PER_DAY = 86_400_000;

/**
 * The UTC Monday-of-week date key (`YYYY-MM-DD`) for a given ISO timestamp.
 * Returns `null` for unparseable input. ISO weeks start on Monday.
 */
export function weekKey(iso: string): string | null {
  const t = parseTime(iso);
  if (t === null) return null;
  const d = new Date(t);
  // getUTCDay(): 0 = Sunday … 6 = Saturday. Shift so Monday = 0.
  const dow = (d.getUTCDay() + 6) % 7;
  const monday = new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) -
      dow * MS_PER_DAY,
  );
  return isoDate(monday);
}

/** The UTC day key (`YYYY-MM-DD`) for a given ISO timestamp, or `null`. */
export function dayKey(iso: string): string | null {
  const t = parseTime(iso);
  if (t === null) return null;
  return isoDate(new Date(t));
}

/** Format a Date as a UTC `YYYY-MM-DD` string. */
export function isoDate(d: Date): string {
  const y = d.getUTCFullYear().toString().padStart(4, "0");
  const m = (d.getUTCMonth() + 1).toString().padStart(2, "0");
  const day = d.getUTCDate().toString().padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Number of whole days between two `YYYY-MM-DD` date keys (b - a). */
export function daysBetween(a: string, b: string): number {
  const ta = Date.parse(`${a}T00:00:00Z`);
  const tb = Date.parse(`${b}T00:00:00Z`);
  if (Number.isNaN(ta) || Number.isNaN(tb)) return NaN;
  return Math.round((tb - ta) / MS_PER_DAY);
}

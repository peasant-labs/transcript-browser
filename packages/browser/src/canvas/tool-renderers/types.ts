/**
 * Pure, parse-free text helpers shared by the outline rails + highlight/annotation
 * views for compact labels (one-line previews, filename basenames, language
 * guesses).
 *
 * The per-tool renderers + the wire `parseArgs` that once lived here are gone:
 * single-transcript tool rendering is now the lifted, cooked-VM-driven
 * `TranscriptToolCall` / `TranscriptToolBody` from `@peasant-labs/fairtrade/ui`,
 * and the SOLE wire parse lives in the fairtrade adapter. These helpers operate on
 * already-cooked strings and never touch wire.
 */

/** Trim and bound a string for compact previews. */
export function preview(s: string | undefined, max = 80): string {
  if (!s) return "";
  const oneLine = s.replace(/\s+/g, " ").trim();
  return oneLine.length > max ? oneLine.slice(0, max - 1) + "…" : oneLine;
}

/** Extract a short filename label from a path. */
export function basename(path: string | undefined): string {
  if (!path) return "";
  const noTrail = path.replace(/\/+$/, "");
  const idx = noTrail.lastIndexOf("/");
  return idx === -1 ? noTrail : noTrail.slice(idx + 1);
}

/** Guess a syntax language from a path extension. */
export function langFromPath(path: string | undefined): string {
  if (!path) return "text";
  const m = /\.([a-zA-Z0-9]+)$/.exec(path);
  return m ? m[1]!.toLowerCase() : "text";
}

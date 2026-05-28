import type { ToolCallDetail } from "@peasant-labs/types";

/** Props every tool renderer receives. */
export interface ToolRendererProps {
  call: ToolCallDetail;
}

/**
 * Safely parse a tool's `arguments` JSON string. Returns the parsed value or
 * undefined when malformed — caller falls back to raw text.
 */
export function parseArgs<T = Record<string, unknown>>(raw: string): T | undefined {
  if (!raw) return undefined;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return undefined;
  }
}

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

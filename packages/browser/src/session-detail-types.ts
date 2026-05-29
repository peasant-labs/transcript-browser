/**
 * Top-level session-detail tab + tab-definition types. Ported from peasant's
 * `session-detail/v2/types.ts`. Shared by the SessionDetail composer, TabStrip,
 * and RightRail.
 */

/** Top-level tab in the session detail view. */
export const SessionTab = {
  Highlights: "highlights",
  Trace: "trace",
  Diffs: "diffs",
  Files: "files",
  Annotations: "annotations",
} as const;
export type SessionTab = (typeof SessionTab)[keyof typeof SessionTab];

export interface SessionTabDef {
  id: SessionTab;
  label: string;
  /** Optional count badge (e.g. 246). */
  count?: number;
}

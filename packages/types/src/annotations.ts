/**
 * Annotation summary — a single human/agent/rule judgement attached to a
 * transcript, entry, project, or another annotation.
 *
 * Source of truth: peasant `web/src/types/messages.ts`, which mirrors Go
 * `pkg/schema/annotation.go` AnnotationSummary. Village's `messages.ts` does
 * not currently carry this type — see DIVERGENCES.md.
 */

/** Wire format for a single annotation, mirroring pkg/schema AnnotationSummary. */
export interface AnnotationSummary {
  id: string;
  /** "session" | "entry" | "annotation" | "project". */
  targetKind: string;
  targetSessionId?: string;
  targetEntryIndex?: number;
  targetAnnotationId?: string;
  targetProjectHash?: string;
  isPrimary: boolean;
  /** "human" | "agent" | "rule". */
  annotatorKind: string;
  annotatorName: string;
  typeId: string;
  typeName: string;
  value: string;
  confidence?: number;
  reason?: string;
  /** Unix milliseconds. */
  createdAt: number;
  supersededBy?: string;
}

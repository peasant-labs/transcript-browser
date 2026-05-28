import type { ReactNode } from "react";
import type { TurnDetail } from "@peasant-labs/types";

/**
 * The agnosticism contract for the transcript browser.
 *
 * Data flows IN via props only — there is no fetching, WebSocket, or env access
 * inside any component. Actions flow OUT via callbacks, gated by capability
 * flags. Every callback and capability is OPTIONAL: the viewer renders fully
 * read-only when none are supplied. Owner-only behaviour (manual labelling,
 * editing, visibility, contribute) is enabled purely by the host passing the
 * relevant callback + capability flag.
 */

/**
 * A label applied to a single turn (entry). Framework-agnostic shape — the host
 * app maps its own annotation model to/from this. `id` is empty for an
 * optimistic, not-yet-persisted label.
 */
export interface TurnLabel {
  /** The entry index this label targets (`turn.index`). */
  entryIndex: number;
  typeId: string;
  typeName: string;
  value: string;
  /** Host-assigned id; empty string for an optimistic pre-save. */
  id: string;
}

/**
 * Build an href for linking to a single turn. Lets the host control routing
 * (deep links, query params, hash) instead of the viewer hardcoding `#turn-N`.
 * Defaults to `#turn-{index}` when not provided.
 */
export type TurnLinkBuilder = (turn: TurnDetail) => string;

/**
 * Capability flags. Each defaults to `false`/absent (read-only). Setting a flag
 * is necessary but not sufficient — the matching callback/slot must also be
 * supplied for the affordance to appear.
 */
export interface ViewerCapabilities {
  /** Can the current viewer apply manual labels to turns? */
  canLabel?: boolean;
  /** Can the current viewer edit the session (rename, etc.)? */
  canEdit?: boolean;
  /** Can the current viewer change session visibility? */
  canChangeVisibility?: boolean;
  /** Can the current viewer contribute / publish the session? */
  canContribute?: boolean;
}

/**
 * Action callbacks. All optional. Wired by future slices (header / action menu)
 * — declared here so the prop surface is stable from this slice forward.
 */
export interface ViewerCallbacks {
  /** Persist a manual label on a turn. Host returns the saved label (with id). */
  onLabelSave?: (label: TurnLabel) => void | Promise<TurnLabel>;
  /** Host-handled session edit (e.g. rename). */
  onEdit?: () => void;
  /** Host-handled visibility change. */
  onVisibilityChange?: (visible: boolean) => void;
  /** Host-handled contribute / publish. */
  onContribute?: () => void;
}

/**
 * Render-prop for the per-turn action slot (e.g. a "Label" popover). The host
 * owns the UI + its data source; the viewer just gives it a place to mount,
 * keeping the app-specific annotation API out of the package. Returns
 * `null`/`undefined` to render nothing.
 */
export type RenderTurnActions = (turn: TurnDetail) => ReactNode;

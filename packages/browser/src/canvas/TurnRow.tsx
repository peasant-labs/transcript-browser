import { useCallback, useState } from "react";
import { Check, Link as LinkIcon } from "lucide-react";
import { cn } from "../internal/cn.js";
import { RoleGlyph, type GlyphRole } from "../primitives/RoleGlyph.js";
import { TokenBadge } from "../primitives/TokenBadge.js";
import { ErrorPill } from "../primitives/ErrorPill.js";
import { Chip } from "../primitives/Chip.js";
import { ProviderIcon } from "../primitives/ProviderIcon.js";
import { formatRelative } from "../lib/time.js";
import { TurnContent } from "./TurnContent.js";
import { ToolCallList } from "./ToolCallList.js";
import type { RenderTurnActions, RenderTurnPanel, TurnLabel, TurnLinkBuilder } from "./types.js";
import type { TurnDetail, Provider } from "@peasant-labs/types";

export interface TurnRowProps {
  turn: TurnDetail;
  /**
   * Label shown in the header. Pre-formatted by `computeTurnLabels` so the
   * inline label always matches an outline rail (e.g. `3`, `3a`, `3b`).
   */
  turnNumber: string | number;
  /** Provider — used to pick the assistant rail icon. */
  provider?: Provider;
  /** Active search term, propagated to TurnContent. */
  searchQuery?: string;
  /** True for the turn the current search match points at. */
  isActiveMatch?: boolean;
  /** True when this turn contains a search match but isn't the active one. */
  isSearchMatch?: boolean;
  /** Force tool calls expanded (view option). */
  expandToolCalls?: boolean;
  /** Hide thinking blocks (view option). */
  hideThinking?: boolean;
  /** Compact mode: tighter vertical rhythm. */
  compact?: boolean;
  className?: string;

  // --- Agnostic action contract (all optional; read-only when absent) ---
  /** Build the anchor href for this turn. Defaults to `#turn-{index}`. */
  linkBuilder?: TurnLinkBuilder;
  /**
   * Host-owned action slot for this turn (e.g. a "Label" popover). Rendered in
   * the header's trailing actions area. The viewer ships no labelling UI of its
   * own — the host wires its annotation API here. See ViewerCallbacks.onLabelSave.
   */
  renderActions?: RenderTurnActions;
  /**
   * Host-owned panel slot for this turn. Rendered as a full-width block at the
   * bottom of the card body, below the content and tool-call list — sized for
   * multi-row host content (file lists, related items), where the header-inline
   * `renderActions` slot is not. Return `null`/`undefined` to skip the panel.
   */
  renderPanel?: RenderTurnPanel;
  /** Saved/optimistic labels on this turn — rendered as chips when present. */
  savedLabels?: TurnLabel[];
}

const ROLE_LABEL: Record<string, string> = {
  user: "You",
  assistant: "Assistant",
  tool: "Tool",
  system: "System",
};

/**
 * A single row in the transcript canvas. Renders the rail glyph, header
 * (role · #label · time · anchor · tokens · error pill · host actions), any
 * saved labels, the markdown body, and the tool-call list.
 *
 * The vertical rail is drawn by TranscriptCanvas as one absolutely-positioned
 * line, so rows just align to it.
 */
export function TurnRow({
  turn,
  turnNumber,
  provider,
  searchQuery,
  isActiveMatch,
  isSearchMatch,
  expandToolCalls,
  hideThinking: _hideThinking,
  compact,
  className,
  linkBuilder,
  renderActions,
  renderPanel,
  savedLabels,
}: TurnRowProps) {
  const subagent = turn.role === "assistant" && (turn.depth ?? 0) > 0;
  const glyphRole: GlyphRole = subagent ? "subagent" : (turn.role as GlyphRole);
  // Conversational roles (top-level user / assistant) carry a role-tinted
  // background + accent bar. Tool / system / subagent rows stay monochrome.
  const colorRole: "user" | "assistant" | null =
    turn.role === "user"
      ? "user"
      : turn.role === "assistant" && !subagent
        ? "assistant"
        : null;
  const roleLabel = subagent
    ? `Subagent${turn.agentName ? ` · ${turn.agentName}` : ""}`
    : (ROLE_LABEL[turn.role] ?? turn.role);
  const useProviderIcon = turn.role === "assistant" && !subagent && !!provider;
  const hasContent = !!turn.content?.trim();
  const hasTools = (turn.toolCalls?.length ?? 0) > 0;
  const hasError = turn.toolCalls?.some((t) => t.isError) ?? false;
  const anchorHref = linkBuilder ? linkBuilder(turn) : `#turn-${turn.index}`;
  const actions = renderActions?.(turn);
  const panel = renderPanel?.(turn);

  // Copy the deep-link to this turn rather than navigating to it. A bare hash
  // (`#turn-N`) is resolved to an absolute URL so the copied link still lands on
  // the right message when pasted elsewhere; host-built absolute links pass
  // through unchanged. Loading a page with that hash anchors to this turn — the
  // composer handles the scroll-on-load (see SessionDetail).
  const [copied, setCopied] = useState(false);
  const copyAnchor = useCallback(() => {
    let url = anchorHref;
    if (typeof window !== "undefined") {
      try {
        url = new URL(anchorHref, window.location.href).toString();
      } catch {
        /* keep the raw href if it can't be resolved */
      }
    }
    const done = () => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    };
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(url).then(done, () => {});
    } else {
      done();
    }
  }, [anchorHref]);

  return (
    <article
      id={`turn-${turn.index}`}
      data-turn-index={turn.index}
      className={cn(
        "tb-turn",
        compact && "tb-turn-compact",
        colorRole === "user" && "tb-turn-user",
        colorRole === "assistant" && "tb-turn-assistant",
        isActiveMatch && "tb-turn-active",
        className,
      )}
    >
      {colorRole && (
        <span
          aria-hidden
          className={cn(
            "tb-turn-accent",
            colorRole === "user" ? "tb-turn-accent-user" : "tb-turn-accent-assistant",
          )}
        />
      )}

      <span
        className={cn(
          "tb-turn-glyph",
          colorRole === "user" && "tb-turn-glyph-user",
          colorRole === "assistant" && "tb-turn-glyph-assistant",
          isActiveMatch && "tb-turn-glyph-active",
        )}
      >
        {useProviderIcon ? (
          <ProviderIcon provider={provider!} size={12} />
        ) : (
          <RoleGlyph role={glyphRole} size={12} />
        )}
      </span>

      {isActiveMatch && <span className="tb-turn-active-bar" aria-hidden />}

      <header className="tb-turn-header">
        <span className={cn("tb-turn-role", turn.role === "user" && "tb-turn-role-user")}>
          {roleLabel}
        </span>
        {turn.depth != null && turn.depth > 0 && !subagent && (
          <span className="tb-turn-depth">depth {turn.depth}</span>
        )}
        <span className="tb-turn-number">#{turnNumber}</span>
        <span className="tb-turn-time" title={new Date(turn.timestamp).toLocaleString()}>
          {formatRelative(turn.timestamp)}
        </span>
        <button
          type="button"
          onClick={copyAnchor}
          aria-label={copied ? "Link copied" : "Copy link to this turn"}
          title={copied ? "Link copied" : "Copy link to this turn"}
          className={cn("tb-turn-anchor tb-focus", copied && "tb-turn-anchor-copied")}
        >
          {copied ? (
            <Check size={11} strokeWidth={2} />
          ) : (
            <LinkIcon size={11} strokeWidth={1.75} />
          )}
        </button>
        <span className="tb-turn-actions">
          {actions}
          {hasError && <ErrorPill />}
          <TokenBadge
            tokens={(turn.tokensIn ?? 0) + (turn.tokensOut ?? 0) || undefined}
            tokensIn={turn.tokensIn}
            tokensOut={turn.tokensOut}
          />
        </span>
      </header>

      {savedLabels && savedLabels.length > 0 && (
        <div className="tb-turn-labels">
          {savedLabels.map((l, i) => (
            <Chip
              key={l.id || `${l.typeId}-${l.value}-${i}`}
              variant="outline"
              tooltip={`${l.typeName}: ${l.value}`}
            >
              {l.typeName} · {l.value}
            </Chip>
          ))}
        </div>
      )}

      <div>
        {hasContent && (
          <TurnContent turn={turn} searchQuery={isSearchMatch ? searchQuery : undefined} />
        )}
        {hasTools && <ToolCallList calls={turn.toolCalls!} expandAll={expandToolCalls} />}
        {panel ? <div className="tb-turn-panel">{panel}</div> : null}
      </div>
    </article>
  );
}

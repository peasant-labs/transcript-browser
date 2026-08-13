import { useCallback, useState } from "react";
import { Check, Link as LinkIcon, CornerDownRight, User, Wrench, AlertTriangle, Coins } from "@peasant-labs/fairtrade/icons";
import { ProviderIcon, TranscriptToolCall, TranscriptTurnCard, providerAccent, type ToolCallVM, type TurnVM } from "@peasant-labs/fairtrade/ui";
import { cn } from "../internal/cn.js";
import { formatTokens } from "../lib/format-numbers.js";
import { formatRelative } from "../lib/time.js";
import { providerLabel } from "../lib/provider.js";
import { ROLE_LABELS, SUBAGENT_LABEL } from "../lib/labels.js";
import { TurnContent } from "./TurnContent.js";
import type { RenderTurnActions, RenderTurnPanel, TurnLabel, TurnLinkBuilder } from "./types.js";
import type { TurnDetail, Harness } from "@peasant-labs/schema";

export interface TurnRowProps {
  turn: TurnDetail;
  /**
   * Label shown in the header. Pre-formatted by `computeTurnLabels` so the
   * inline label always matches an outline rail (e.g. `3`, `3a`, `3b`).
   */
  turnNumber: string | number;
  /** Harness — used to pick the assistant rail icon. */
  provider?: Harness;
  /**
   * The cooked tool calls for this turn — the adapter's `ToolCallVM[]` (parsed
   * `args`/`output`, one-line `preview`, classified `kind`/`group`, computed
   * `diff`). Rendered by the lifted `TranscriptToolCall`, which reads these
   * fields directly and NEVER parses wire. Parallel to `turn.toolCalls` by id.
   */
  toolVMs?: ToolCallVM[];
  /** Complete Fairtrade view-model turn for the canonical card path. */
  cookedTurn?: TurnVM;
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
  /** Host-owned action slot for this turn (e.g. a "label" popover). */
  renderActions?: RenderTurnActions;
  /** Host-owned panel slot for this turn (full-width block below the body). */
  renderPanel?: RenderTurnPanel;
  /** Saved/optimistic labels on this turn — rendered as chips when present. */
  savedLabels?: TurnLabel[];
}

/**
 * A single transcript turn, rendered with the canonical `.txn-*` markup (the
 * in-use demo's structure): a `.turn.txn-turn` card whose role class (user /
 * asst / sub) carries the accent, a mono `.txn-turnhead` (role label + number +
 * time + copy-anchor + token badge), and the markdown body + tool calls. The
 * assistant leads with its real, accent-tinted provider mark; user stays teal /
 * subagent mauve via the role class.
 */
export function TurnRow({
  turn,
  turnNumber,
  provider,
  toolVMs,
  cookedTurn,
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
  if (cookedTurn?.role && TranscriptTurnCard) {
    return (
      <TranscriptTurnCard
        turn={cookedTurn}
        compact={compact}
        expandAll={expandToolCalls}
        renderActions={renderActions ? () => renderActions(turn) : undefined}
      />
    );
  }
  const subagent = turn.role === "assistant" && (turn.depth ?? 0) > 0;
  const isUser = turn.role === "user";
  const isAssistant = turn.role === "assistant" && !subagent;
  // Role class drives the canonical accent (border + tint): user=teal,
  // asst=amber, sub=mauve. Tool/system turns stay monochrome (no role class).
  const roleClass = isUser ? "user" : subagent ? "sub" : isAssistant ? "asst" : null;
  // The assistant IS the agent → tint its role label + mark with the provider
  // accent. Only a genuinely absent provider uses the documented neutral
  // fallback; every present value crosses Fairtrade's canonical validation
  // boundary before it can select a trusted identity or colour.
  const accentName = provider === undefined ? "amber" : providerAccent(provider);
  const asstAccent = isAssistant ? `var(--${accentName})` : undefined;
  const roleLabel = subagent
    ? `${SUBAGENT_LABEL}${turn.agentName ? ` · ${turn.agentName}` : ""}`
    : isAssistant && provider !== undefined
      ? providerLabel(provider)
      : (ROLE_LABELS[turn.role] ?? turn.role);

  const hasContent = !!turn.content?.trim();
  const tools = toolVMs ?? [];
  const hasTools = tools.length > 0;
  const hasError = turn.toolCalls?.some((t) => t.isError) ?? false;
  const anchorHref = linkBuilder ? linkBuilder(turn) : `#turn-${turn.index}`;
  const actions = renderActions?.(turn);
  const panel = renderPanel?.(turn);
  const totalTokens = (turn.tokensIn ?? 0) + (turn.tokensOut ?? 0);
  const tokenTitle =
    turn.tokensIn != null && turn.tokensOut != null
      ? `${turn.tokensIn.toLocaleString()} in · ${turn.tokensOut.toLocaleString()} out`
      : undefined;

  const [copied, setCopied] = useState(false);
  // Per-tool expand state for the lifted (controlled) TranscriptToolCall rows.
  // `expandToolCalls` (the view option) force-opens every row on top of this.
  const [openTools, setOpenTools] = useState<Record<string, boolean>>({});
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

  const head = (
    <div className="txn-turnhead">
      <span className="txn-rolelabel" style={asstAccent ? { color: asstAccent } : undefined}>
        {isAssistant && provider !== undefined ? (
          <ProviderIcon harness={provider} accent />
        ) : subagent ? (
          <CornerDownRight size={14} aria-hidden />
        ) : isUser ? (
          <User size={14} aria-hidden />
        ) : (
          <Wrench size={14} aria-hidden />
        )}
        {roleLabel}
      </span>
      {subagent && turn.depth != null && <span className="txn-depth tnum">depth {turn.depth}</span>}
      <span className="txn-turnnum tnum">#{turnNumber}</span>
      <span className="txn-turntime" title={new Date(turn.timestamp).toLocaleString()}>
        {formatRelative(turn.timestamp)}
      </span>
      <button
        type="button"
        onClick={copyAnchor}
        aria-label={copied ? "link copied" : "copy link to this turn"}
        title={copied ? "link copied" : "copy link to this turn"}
        className="txn-anchor"
      >
        {copied ? <Check size={13} aria-hidden /> : <LinkIcon size={13} aria-hidden />}
      </button>
      {actions ? <span className="txn-actions">{actions}</span> : null}
      {hasError && (
        <span className="chip chip-err txn-pill">
          <AlertTriangle size={12} aria-hidden /> error
        </span>
      )}
      {totalTokens > 0 && (
        <span className="txn-tokbadge tnum" title={tokenTitle}>
          <Coins size={12} aria-hidden /> {formatTokens(totalTokens)}
        </span>
      )}
    </div>
  );

  const body = (
    <>
      {savedLabels && savedLabels.length > 0 && (
        <div className="txn-savedchips">
          {savedLabels.map((l, i) => (
            <span key={l.id || `${l.typeId}-${l.value}-${i}`} className="chip">
              {l.typeName} · {l.value}
            </span>
          ))}
        </div>
      )}
      {hasContent && <TurnContent turn={turn} searchQuery={isSearchMatch ? searchQuery : undefined} />}
      {hasTools && (
        <div className="tb-toolcall-list">
          {tools.map((tc) => (
            <TranscriptToolCall
              key={tc.id}
              tool={tc}
              open={expandToolCalls || !!openTools[tc.id]}
              onToggle={() => setOpenTools((s) => ({ ...s, [tc.id]: !s[tc.id] }))}
            />
          ))}
        </div>
      )}
      {panel ? <div className="tb-turn-panel">{panel}</div> : null}
    </>
  );

  const cardClass = cn(
    "turn txn-turn",
    roleClass,
    isActiveMatch && "txn-active",
    compact && "txn-compact",
    className,
  );

  return (
    <div id={`turn-${turn.index}`} data-turn-index={turn.index} className="txn-turnwrap">
      {subagent ? (
        <div className="subtask txn-subtask" data-harness={provider}>
          <div className="subtask-head">
            <CornerDownRight size={13} aria-hidden /> <span className="who">{turn.agentName}</span> subagent
          </div>
          <div className={cardClass}>
            {head}
            {body}
          </div>
          <div className="subtask-foot">
            <span className="elbow">
              <CornerDownRight size={13} aria-hidden /> returned to {provider ? providerLabel(provider) : "main"}
            </span>
          </div>
        </div>
      ) : (
        <div className={cardClass} data-harness={isAssistant ? provider : undefined}>
          {head}
          {body}
        </div>
      )}
    </div>
  );
}

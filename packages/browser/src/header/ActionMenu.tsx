import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Check, Download, Link as LinkIcon, MessageSquareText, MoreHorizontal, Pencil, Share2, Users } from "@peasant-labs/fairtrade/icons";
import { cn } from "../internal/cn.js";
import { ACTION_LABELS } from "../lib/labels.js";
import type { SessionDetailPayload } from "@peasant-labs/schema";
import type { ViewerCallbacks, ViewerCapabilities, DownloadFormat } from "../canvas/types.js";

export interface ActionMenuProps {
  detail: SessionDetailPayload;
  /**
   * Capability flags — each item appears only when its flag is set AND the
   * matching callback (or, for download, the built-in serializer) is available.
   */
  capabilities?: ViewerCapabilities;
  /** Action callbacks. See ViewerCallbacks. */
  callbacks?: ViewerCallbacks;
  /**
   * Builds the shareable session link, passed to `onCopyLink`. The viewer never
   * hardcodes a route — the host owns link shape. Required for Copy link.
   */
  linkBuilder?: (detail: SessionDetailPayload) => string;
  /**
   * Label for the primary "contribute/share" button. peasant uses "Share";
   * village uses "Share" with a collective-picker beneath. The host can rename.
   */
  shareLabel?: string;
  /** Label for the contribute menu item (e.g. "Contribute to a collective"). */
  contributeLabel?: string;
  className?: string;
}

/**
 * Agnostic action cluster for the session header. Reconciles the two app
 * ActionMenus (peasant: Share→wizard + Download/Chat; village: Contribute to a
 * collective + Copy link + owner-gated Edit + Download/Chat) into a single
 * capability-gated surface. No app-specific strings, routes, auth, fetching or
 * dialogs live here — the host wires each affordance via `capabilities` +
 * `callbacks`, and owns its own flows (collective picker, edit dialog, etc.).
 *
 *   • Share/Contribute  → `canContribute` + `onContribute`
 *   • Copy link         → `canCopyLink` + `linkBuilder` + `onCopyLink`
 *   • Edit              → `canEdit` + `onEdit` (host owns owner-gating)
 *   • Download          → `canDownload` (uses built-in serializer, or `onDownload`)
 *   • Chat with trace   → `canChatWithTrace` + `onChatWithTrace`
 *
 * Owner-gating (village's Edit) is expressed by the host setting `canEdit` only
 * when the viewer owns the session — the package never reads auth.
 */
export function ActionMenu({
  detail,
  capabilities = {},
  callbacks = {},
  linkBuilder,
  shareLabel = ACTION_LABELS.share,
  contributeLabel = ACTION_LABELS.contribute,
  className,
}: ActionMenuProps) {
  const { canContribute, canCopyLink, canEdit, canDownload, canChatWithTrace } = capabilities;
  const { onContribute, onCopyLink, onEdit, onDownload, onChatWithTrace } = callbacks;

  const showContribute = !!canContribute && !!onContribute;
  const showCopyLink = !!canCopyLink && !!linkBuilder;
  const showEdit = !!canEdit && !!onEdit;
  // Download works with the built-in serializer even without an onDownload.
  const showDownload = !!canDownload;
  const showChat = !!canChatWithTrace && !!onChatWithTrace;

  const showShareMenu = showContribute || showCopyLink;
  const showOverflow = showEdit || showDownload || showChat;

  const [copied, setCopied] = useState(false);

  const handleDownload = useCallback(
    (format: DownloadFormat) => {
      if (onDownload) {
        onDownload(format);
        return;
      }
      const filename = `session-${detail.id.slice(0, 8)}.${format === "markdown" ? "md" : format === "jsonl" ? "jsonl" : "json"}`;
      const content = renderDownload(detail, format);
      const mime = format === "markdown" ? "text/markdown" : format === "jsonl" ? "application/x-ndjson" : "application/json";
      const blob = new Blob([content], { type: mime });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },
    [detail, onDownload],
  );

  const handleCopyLink = useCallback(() => {
    if (!linkBuilder) return;
    const url = linkBuilder(detail);
    onCopyLink?.(url);
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(url).then(
        () => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        },
        () => {},
      );
    } else {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  }, [detail, linkBuilder, onCopyLink]);

  if (!showShareMenu && !showOverflow) return null;

  return (
    <div className={cn("tb-actionmenu", className)}>
      {showShareMenu && (
        <Menu
          trigger={
            <span className="tb-actionmenu-share" role="button" title={shareLabel} tabIndex={0}>
              <Share2 size={13} strokeWidth={1.75} />
              {shareLabel}
            </span>
          }
          align="end"
          width={240}
        >
          {(close) => (
            <>
              {showContribute && (
                <MenuItem
                  icon={<Users size={12} strokeWidth={1.75} />}
                  onClick={() => {
                    close();
                    onContribute?.();
                  }}
                >
                  {contributeLabel}
                </MenuItem>
              )}
              {showCopyLink && (
                <MenuItem
                  icon={copied ? <Check size={12} strokeWidth={2} className="tb-ink-positive" /> : <LinkIcon size={12} strokeWidth={1.75} />}
                  onClick={handleCopyLink}
                >
                  {copied ? ACTION_LABELS.copied : ACTION_LABELS.copyLink}
                </MenuItem>
              )}
            </>
          )}
        </Menu>
      )}

      {showOverflow && (
        <Menu
          trigger={
            <span className="tb-actionmenu-more" role="button" aria-label="More actions" title="More actions" tabIndex={0}>
              <MoreHorizontal size={14} strokeWidth={1.75} />
            </span>
          }
          align="end"
          width={224}
        >
          {(close) => (
            <>
              {showEdit && (
                <>
                  <MenuItem
                    icon={<Pencil size={12} strokeWidth={1.75} />}
                    onClick={() => {
                      close();
                      onEdit?.();
                    }}
                  >
                    edit
                  </MenuItem>
                  {showDownload || showChat ? <div className="tb-menu-divider" /> : null}
                </>
              )}
              {showDownload && (
                <>
                  <MenuItem icon={<Download size={12} strokeWidth={1.75} />} onClick={() => handleDownload("json")}>
                    download json
                  </MenuItem>
                  <MenuItem icon={<Download size={12} strokeWidth={1.75} />} onClick={() => handleDownload("jsonl")}>
                    download jsonl
                  </MenuItem>
                  <MenuItem icon={<Download size={12} strokeWidth={1.75} />} onClick={() => handleDownload("markdown")}>
                    download markdown
                  </MenuItem>
                </>
              )}
              {showChat && (
                <>
                  {showDownload ? <div className="tb-menu-divider" /> : null}
                  <MenuItem
                    icon={<MessageSquareText size={12} strokeWidth={1.75} />}
                    onClick={() => {
                      close();
                      onChatWithTrace?.();
                    }}
                  >
                    chat with trace
                  </MenuItem>
                </>
              )}
            </>
          )}
        </Menu>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Self-contained dropdown menu (replaces the source apps' Radix Popover)
// ---------------------------------------------------------------------------

function Menu({
  trigger,
  children,
  align = "end",
  width,
}: {
  trigger: ReactNode;
  children: (close: () => void) => ReactNode;
  align?: "start" | "end";
  width?: number;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="tb-menu-host">
      <span
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setOpen((v) => !v);
          }
        }}
      >
        {trigger}
      </span>
      {open && (
        <div className={cn("tb-menu-panel", align === "end" ? "tb-menu-panel-end" : "tb-menu-panel-start")} style={width ? { width } : undefined} role="menu">
          {children(close)}
        </div>
      )}
    </div>
  );
}

function MenuItem({ children, icon, onClick, disabled }: { children: ReactNode; icon?: ReactNode; onClick?: () => void; disabled?: boolean }) {
  return (
    <button type="button" role="menuitem" onClick={onClick} disabled={disabled} className={cn("tb-menu-item", disabled && "tb-menu-item-disabled")}>
      {icon}
      {children}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Default download serialization (host can override via onDownload)
// ---------------------------------------------------------------------------

/**
 * Built-in transcript serializer for the download menu. Identical to the
 * serializer both apps shipped, so hosts get JSON / JSONL / Markdown export for
 * free; override with `callbacks.onDownload` for app-specific formats.
 */
export function renderDownload(detail: SessionDetailPayload, format: DownloadFormat): string {
  if (format === "json") return JSON.stringify(detail, null, 2);
  if (format === "jsonl") return (detail.turns ?? []).map((t) => JSON.stringify(t)).join("\n");

  const lines: string[] = [];
  lines.push(`# Session \`${detail.id}\``);
  lines.push("");
  lines.push(`- **Harness:** ${detail.harness}`);
  if (detail.model) lines.push(`- **Model:** ${detail.model}`);
  lines.push(`- **Started:** ${detail.startTime}`);
  if (detail.durationMins) lines.push(`- **Duration:** ${detail.durationMins.toFixed(1)} min`);
  lines.push(`- **Tokens:** ${detail.totalTokens.toLocaleString()}`);
  lines.push("");
  lines.push("---");
  for (const turn of detail.turns ?? []) {
    lines.push("");
    lines.push(`## ${turn.role} — turn ${turn.index}`);
    lines.push("");
    if (turn.content) lines.push(turn.content);
    for (const tc of turn.toolCalls ?? []) {
      lines.push("");
      lines.push(`**Tool call:** \`${tc.name}\``);
      if (tc.arguments) {
        lines.push("");
        lines.push("```");
        lines.push(tc.arguments);
        lines.push("```");
      }
    }
  }
  return lines.join("\n");
}

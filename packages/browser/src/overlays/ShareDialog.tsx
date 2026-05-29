import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Check, Copy, Globe, Lock, X } from "lucide-react";
import { cn } from "../internal/cn.js";

export type Visibility = "private" | "public";

export interface ShareDialogProps {
  open: boolean;
  onClose: () => void;
  shareUrl: string;
  visibility?: Visibility;
  /**
   * Visibility-change callback. When ABSENT the visibility toggle is hidden and
   * the dialog is read-only (copy-link only) — matching the contract that
   * actions out require a callback. When present, `canChangeVisibility` on the
   * host gates whether it's offered at all.
   */
  onVisibilityChange?: (v: Visibility) => void;
  /** Footer note about redaction; host can override. */
  note?: ReactNode;
}

/**
 * Share dialog — a share-link field (copy) plus an optional visibility toggle.
 * The visibility toggle only appears when `onVisibilityChange` is supplied, so
 * the dialog is read-only when the host can't (or won't) change visibility.
 * Ported from peasant's `overlays/ShareDialog.tsx`.
 */
export function ShareDialog({ open, onClose, shareUrl, visibility = "private", onVisibilityChange, note }: ShareDialogProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard?.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }, [shareUrl]);

  useEffect(() => {
    if (!open) return;
    requestAnimationFrame(() => inputRef.current?.select());
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="tb-root tb-sharedialog-backdrop" role="dialog" aria-modal aria-label="Share session" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="tb-sharedialog">
        <header className="tb-sharedialog-head">
          <h2 className="tb-sharedialog-title">Share session</h2>
          <button type="button" onClick={onClose} className="tb-sharedialog-close tb-focus" aria-label="Close">
            <X size={14} strokeWidth={1.75} />
          </button>
        </header>

        <div className="tb-sharedialog-body">
          <div>
            <label className="tb-eyebrow tb-sharedialog-label">Share link</label>
            <div className="tb-sharedialog-linkrow">
              <input ref={inputRef} type="text" value={shareUrl} readOnly className="tb-mono tb-sharedialog-input" />
              <button type="button" onClick={handleCopy} className="tb-sharedialog-copy tb-focus">
                {copied ? <Check size={13} strokeWidth={2} /> : <Copy size={13} strokeWidth={1.75} />}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
          </div>

          {onVisibilityChange && (
            <div>
              <label className="tb-eyebrow tb-sharedialog-label">Visibility</label>
              <div className="tb-sharedialog-visibility">
                <VisibilityButton
                  active={visibility === "private"}
                  onClick={() => onVisibilityChange("private")}
                  icon={<Lock size={12} strokeWidth={1.75} />}
                  label="Private"
                  desc="Only you can view"
                />
                <VisibilityButton
                  active={visibility === "public"}
                  onClick={() => onVisibilityChange("public")}
                  icon={<Globe size={12} strokeWidth={1.75} />}
                  label="Public"
                  desc="Anyone with the link"
                />
              </div>
            </div>
          )}

          <p className="tb-sharedialog-note">
            {note ??
              "Shared transcripts include redacted content where applicable. Sensitive system metadata is removed before sharing."}
          </p>
        </div>
      </div>
    </div>
  );
}

function VisibilityButton({
  active,
  onClick,
  icon,
  label,
  desc,
}: {
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
  label: string;
  desc: string;
}) {
  return (
    <button type="button" onClick={onClick} className={cn("tb-sharedialog-vbtn tb-focus", active && "tb-sharedialog-vbtn-active")}>
      <span className="tb-sharedialog-vbtn-label">
        {icon}
        {label}
      </span>
      <span className={cn("tb-sharedialog-vbtn-desc", active && "tb-sharedialog-vbtn-desc-active")}>{desc}</span>
    </button>
  );
}

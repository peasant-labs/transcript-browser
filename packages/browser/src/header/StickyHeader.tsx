import { useRef } from "react";
import { cn } from "../internal/cn.js";
import { ProviderIcon } from "@peasant-labs/fairtrade/ui";
import { ActionMenu } from "./ActionMenu.js";
import { HorizontalScrubber } from "../rails/HorizontalScrubber.js";
import { composeSessionTitle } from "../lib/title.js";
import type { SessionDetailPayload, TurnDetail } from "@peasant-labs/schema";
import type { ViewerCallbacks, ViewerCapabilities } from "../canvas/types.js";

export interface StickyHeaderProps {
  detail: SessionDetailPayload;
  /** Caller controls visibility (typically via useTriggerOffscreen). */
  visible: boolean;
  /** Display-order turns (already filtered/deduped) — used by the scrubber. */
  turns?: TurnDetail[];
  /** First/last visible turn indices — for the scrubber's viewport bracket. */
  viewportRange?: { start: number; end: number };
  /** Turn indices flagged as errors — for the scrubber's error markers. */
  errorTurns?: number[];
  /** Turn indices with a non-error label (retry loops, reverts, …). */
  flaggedTurns?: number[];
  /** Seek handler invoked when the user clicks/drags the scrubber. */
  onSeek?: (turnIndex: number, behavior?: "auto" | "smooth") => void;
  /** When false, the scrubber is hidden. */
  showScrubber?: boolean;
  /**
   * `top` offset in px. Defaults to 0 (pinned to the viewport top). Hosts with
   * their own app navbar pass its height so the sticky header sits below it.
   */
  top?: number;

  // --- Action contract (passed through to the embedded ActionMenu) ---
  capabilities?: ViewerCapabilities;
  callbacks?: ViewerCallbacks;
  linkBuilder?: (detail: SessionDetailPayload) => string;
  shareLabel?: string;
  contributeLabel?: string;
  className?: string;
}

/**
 * Sticky condensed header. Appears once the hero scrolls off the top of the
 * viewport. Title, provider chip, scrubber, action menu. Ported from peasant's
 * `header/StickyHeader.tsx`; the hardcoded `top-16` (below peasant's app
 * navbar) becomes a `top` prop so the package owns no app layout assumptions.
 */
export function StickyHeader({
  detail,
  visible,
  turns,
  viewportRange,
  errorTurns,
  flaggedTurns,
  onSeek,
  showScrubber: showScrubberProp = true,
  top = 0,
  capabilities,
  callbacks,
  linkBuilder,
  shareLabel,
  contributeLabel,
  className,
}: StickyHeaderProps) {
  const headerRef = useRef<HTMLDivElement>(null);

  const firstUser = detail.turns?.find((t) => t.role === "user" && t.content?.trim());
  const { title: titleText, tooltip: fullTitle } = composeSessionTitle({
    id: detail.id,
    project: detail.project,
    promptContent: firstUser?.content,
    limit: 60,
  });
  const showScrubber = showScrubberProp && !!turns && turns.length > 0;

  return (
    <div
      ref={headerRef}
      role="region"
      aria-label="Session header (condensed)"
      aria-hidden={!visible}
      style={{ top }}
      className={cn("tb-stickyhead", visible ? "tb-stickyhead-visible" : "tb-stickyhead-hidden", className)}
    >
      <div className="tb-stickyhead-inner">
        <h2 className="tb-stickyhead-title tb-truncate" title={fullTitle}>
          {titleText}
        </h2>

        {showScrubber ? (
          <div className="tb-stickyhead-scrubber">
            <HorizontalScrubber turns={turns!} viewportRange={viewportRange} errorTurns={errorTurns} flaggedTurns={flaggedTurns} onSeek={onSeek} />
          </div>
        ) : (
          <div className="tb-stickyhead-spacer" aria-hidden />
        )}

        <span className="tb-stickyhead-provider">
          <ProviderIcon harness={detail.harness} size={12} />
          {detail.model && <span className="tb-mono tb-tnum tb-stickyhead-model">{detail.model}</span>}
        </span>

        <div className="tb-shrink-0">
          <ActionMenu
            detail={detail}
            capabilities={capabilities}
            callbacks={callbacks}
            linkBuilder={linkBuilder}
            shareLabel={shareLabel}
            contributeLabel={contributeLabel}
          />
        </div>
      </div>
    </div>
  );
}

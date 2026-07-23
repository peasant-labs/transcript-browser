import { useMemo, type ReactNode } from "react";
import { Breadcrumb, type BreadcrumbItem } from "./Breadcrumb.js";
import { MetadataChips } from "./MetadataChips.js";
import { ActionMenu } from "./ActionMenu.js";
import { collectOutcomeReasons } from "../primitives/OutcomeChip.js";
import { cn } from "../internal/cn.js";
import { composeSessionTitle } from "../lib/title.js";
import type { SessionDetailPayload, TurnDetail } from "@peasant-labs/schema";
import type { SessionGitVM } from "@peasant-labs/fairtrade/ui";
import type { ViewerCallbacks, ViewerCapabilities } from "../canvas/types.js";

export interface SessionHeroProps {
  detail: SessionDetailPayload;
  breadcrumb: BreadcrumbItem[];
  /** Displayable turns (after dedup/fold). */
  displayTurnCount: number;
  /** Cooked git metadata from the canonical Fairtrade adapter. */
  git?: SessionGitVM;
  /** First user prompt — used to compose the title. */
  firstUserPrompt?: TurnDetail;
  /** Optional ribbon of chips (provenance, share status, redaction). */
  extraChips?: ReactNode;
  /** Outcome reasons for the metadata outcome popover. */
  outcomeReasons?: string[];

  // --- Action contract (all optional; the menu hides when nothing applies) ---
  capabilities?: ViewerCapabilities;
  callbacks?: ViewerCallbacks;
  linkBuilder?: (detail: SessionDetailPayload) => string;
  shareLabel?: string;
  contributeLabel?: string;
}

/**
 * Top of the session detail page — breadcrumb, title, metadata chip strip, and
 * the agnostic action menu. Ported from peasant's `header/SessionHero.tsx`.
 */
export function SessionHero({
  detail,
  breadcrumb,
  displayTurnCount,
  git,
  firstUserPrompt,
  extraChips,
  outcomeReasons,
  capabilities,
  callbacks,
  linkBuilder,
  shareLabel,
  contributeLabel,
}: SessionHeroProps) {
  const { title, tooltip: fullTitle } = useMemo(
    () =>
      composeSessionTitle({
        id: detail.id,
        project: detail.project,
        promptContent: firstUserPrompt?.content,
      }),
    [detail.id, detail.project, firstUserPrompt?.content],
  );

  const reasons = outcomeReasons ?? collectOutcomeReasons({});

  return (
    <header className="tb-hero">
      <div className="tb-hero-top">
        <Breadcrumb items={breadcrumb} className="tb-hero-breadcrumb" />
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

      <h1 className={cn("tb-hero-title", "tb-truncate")} title={fullTitle}>
        {title}
      </h1>

      {extraChips && <div className="tb-hero-extra">{extraChips}</div>}

      <MetadataChips detail={detail} git={git} displayTurnCount={displayTurnCount} outcome={detail.outcome} outcomeReasons={reasons} />
    </header>
  );
}

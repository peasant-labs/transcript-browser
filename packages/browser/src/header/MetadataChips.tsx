import { Chip, MetaItem, ProviderIcon } from "@peasant-labs/fairtrade/ui";
import { Clock, Coins, FileText, GitCommitHorizontal, ListTree, User, Wrench } from "@peasant-labs/fairtrade/icons";
import { OutcomeChip } from "../primitives/OutcomeChip.js";
import { formatDurationMins, formatRelative, formatDateLong } from "../lib/time.js";
import { formatTokens } from "../lib/format-numbers.js";
import { providerLabel } from "../lib/provider.js";
import type { SessionDetailPayload } from "@peasant-labs/types";

export interface MetadataChipsProps {
  detail: SessionDetailPayload;
  /** Number of displayable turns (after dedup/fold). */
  displayTurnCount?: number;
  /** Session outcome — `resolved`/`partial`/`failed`. When omitted, no chip. */
  outcome?: string;
  /** Contributing "why" signals for the outcome popover. */
  outcomeReasons?: string[];
}

/**
 * Session metadata row, matching the canonical in-use demo: the first items are
 * BORDERED <Chip>s (status / provider / model) and everything after is a
 * BORDERLESS <MetaItem> (icon + tabular value + label). Chrome reads lowercase
 * + mono; user content (model id, git author) keeps its case. Provider leads
 * with its real, accent-tinted brand mark.
 */
export function MetadataChips({ detail, displayTurnCount, outcome, outcomeReasons }: MetadataChipsProps) {
  const provider = detail.harness;
  const author = detail.gitContext?.user;
  const commits = detail.gitContext?.commits?.length ?? 0;
  const filesChanged = detail.gitContext?.commits?.reduce((n, c) => n + (c.filesChanged ?? 0), 0) ?? 0;
  const insertions = detail.gitContext?.commits?.reduce((n, c) => n + (c.insertions ?? 0), 0) ?? 0;
  const deletions = detail.gitContext?.commits?.reduce((n, c) => n + (c.deletions ?? 0), 0) ?? 0;
  const tokens = detail.totalTokens;
  const tokensIn = detail.tokensIn;
  const tokensOut = detail.tokensOut;
  const turnCount = displayTurnCount ?? detail.turnCount;
  const toolCalls = detail.toolCallCount;
  const timeValue =
    detail.durationMins != null && detail.durationMins > 0
      ? formatDurationMins(detail.durationMins)
      : formatRelative(detail.startTime);

  return (
    <div className="tb-metachips">
      {/* Bordered status / identity chips */}
      <OutcomeChip outcome={outcome} reasons={outcomeReasons} />
      <Chip>
        <ProviderIcon harness={provider} accent size={14} /> {providerLabel(provider)}
      </Chip>
      {detail.model && <Chip className="mono">{detail.model}</Chip>}

      {/* Borderless meta (icon + tabular value + label) */}
      {author && (
        <MetaItem icon={User} title="git author">
          {author}
        </MetaItem>
      )}
      <MetaItem icon={Clock} value={timeValue} title={formatDateLong(detail.startTime)} />
      {turnCount > 0 && (
        <MetaItem icon={ListTree} value={turnCount.toLocaleString()}>
          turns
        </MetaItem>
      )}
      {toolCalls > 0 && (
        <MetaItem icon={Wrench} value={toolCalls.toLocaleString()}>
          tools
        </MetaItem>
      )}
      {tokens > 0 && (
        <MetaItem
          icon={Coins}
          value={formatTokens(tokens)}
          title={tokensIn != null && tokensOut != null ? `${tokensIn.toLocaleString()} in · ${tokensOut.toLocaleString()} out` : undefined}
        >
          tokens
        </MetaItem>
      )}
      {commits > 0 && (
        <MetaItem icon={GitCommitHorizontal} value={commits}>
          {commits === 1 ? "commit" : "commits"}
        </MetaItem>
      )}
      {filesChanged > 0 && (
        <MetaItem icon={FileText} value={filesChanged}>
          {filesChanged === 1 ? "file" : "files"}
        </MetaItem>
      )}
      {(insertions > 0 || deletions > 0) && (
        <MetaItem className="tb-tnum" title="lines added / removed across commits">
          <span className="tb-ink-positive">+{insertions.toLocaleString()}</span>
          <span className="tb-hl-sep">/</span>
          <span className="tb-ink-danger">−{deletions.toLocaleString()}</span>
        </MetaItem>
      )}
    </div>
  );
}

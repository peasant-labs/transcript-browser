import { Clock, FileEdit, GitCommit, Hash, User } from "lucide-react";
import { ProviderIcon } from "../primitives/ProviderIcon.js";
import { Chip } from "../primitives/Chip.js";
import { OutcomeChip } from "../primitives/OutcomeChip.js";
import { formatDurationMins, formatRelative, formatDateLong } from "../lib/time.js";
import { formatTokens } from "../primitives/TokenBadge.js";
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
 * Inline strip of monochrome chips summarizing a session — provider, model,
 * author, time, duration, turns/tool calls, files, churn, tokens. Ported from
 * peasant's `header/MetadataChips.tsx`.
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

  return (
    <div className="tb-metachips">
      <OutcomeChip outcome={outcome} reasons={outcomeReasons} />

      <Chip icon={<ProviderIcon provider={provider} size={11} />} tooltip="The AI coding tool this session was recorded from.">
        {providerLabel(provider)}
      </Chip>

      {detail.model && (
        <Chip icon={<Hash size={11} strokeWidth={1.75} />} tooltip="The model version that produced this session.">
          {detail.model}
        </Chip>
      )}

      {author && (
        <Chip icon={<User size={11} strokeWidth={1.75} />} tooltip="Git author this session is attributed to.">
          {author}
        </Chip>
      )}

      <Chip icon={<Clock size={11} strokeWidth={1.75} />} title={formatDateLong(detail.startTime)}>
        {formatRelative(detail.startTime)}
      </Chip>

      {detail.durationMins != null && detail.durationMins > 0 && (
        <Chip title="Wall-clock duration">{formatDurationMins(detail.durationMins)}</Chip>
      )}

      {turnCount > 0 && <Chip title="Turns">{turnCount.toLocaleString()} turns</Chip>}

      {toolCalls > 0 && <Chip title="Tool calls">{toolCalls.toLocaleString()} tools</Chip>}

      {tokens > 0 && (
        <Chip
          title={
            tokensIn != null && tokensOut != null
              ? `${tokensIn.toLocaleString()} in · ${tokensOut.toLocaleString()} out`
              : undefined
          }
        >
          {formatTokens(tokens)} tokens
        </Chip>
      )}

      {commits > 0 && (
        <Chip icon={<GitCommit size={11} strokeWidth={1.75} />} title="Commits during session">
          {commits} {commits === 1 ? "commit" : "commits"}
        </Chip>
      )}

      {filesChanged > 0 && (
        <Chip icon={<FileEdit size={11} strokeWidth={1.75} />} title="Files touched across commits">
          {filesChanged} {filesChanged === 1 ? "file" : "files"}
        </Chip>
      )}

      {(insertions > 0 || deletions > 0) && (
        <Chip title="Lines added / removed across commits">
          <span className="tb-ink-positive">+{insertions.toLocaleString()}</span>
          <span className="tb-hl-sep">/</span>
          <span className="tb-ink-danger">−{deletions.toLocaleString()}</span>
        </Chip>
      )}
    </div>
  );
}

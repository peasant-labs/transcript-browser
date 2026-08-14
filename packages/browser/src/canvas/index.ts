export {
  TranscriptCanvas,
  type TranscriptCanvasProps,
} from "./TranscriptCanvas.js";
export { TurnRow, type TurnRowProps } from "./TurnRow.js";
export { TurnContent, type TurnContentProps } from "./TurnContent.js";
export { ThinkingBlock, type ThinkingBlockProps } from "./ThinkingBlock.js";
// Single-transcript tool rendering, the phase/task/checkpoint markers, and
// wire-argument parsing all live in @peasant-labs/fairtrade/ui
// (TranscriptToolCall/TranscriptToolBody, the TranscriptMarkers family, and
// adaptTranscript). This package intentionally exports no ToolCallRow,
// ToolCallList, per-tool renderer, or parseArgs; the canvas only maps domain data
// onto Fairtrade props.
export { EmptyState, type EmptyStateProps } from "./EmptyState.js";
export {
  ViewModeToggle,
  type ViewModeToggleProps,
  type TrajectoryMode,
} from "./ViewModeToggle.js";

// Parse-free compact-label helpers used by the outline rails and
// highlight/annotation views (they still live under tool-renderers/ for
// historical reasons).
export { preview, basename, langFromPath } from "./tool-renderers/types.js";

export type {
  TurnLabel,
  TurnLinkBuilder,
  ViewerCapabilities,
  ViewerCallbacks,
  RenderTurnActions,
  RenderTurnPanel,
  DownloadFormat,
} from "./types.js";
export type {
  AlignedTurnRow,
  AlignmentDiagnostic,
  RowAlignment,
  TurnRowKey,
} from "../lib/turn-alignment.js";

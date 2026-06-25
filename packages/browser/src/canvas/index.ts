export {
  TranscriptCanvas,
  type TranscriptCanvasProps,
} from "./TranscriptCanvas.js";
export { TurnRow, type TurnRowProps } from "./TurnRow.js";
export { TurnContent, type TurnContentProps } from "./TurnContent.js";
export { ThinkingBlock, type ThinkingBlockProps } from "./ThinkingBlock.js";
// Single-transcript tool rendering is now the lifted, cooked-VM-driven
// TranscriptToolCall / TranscriptToolBody from @peasant-labs/fairtrade/ui; TB's
// own ToolCallList / ToolCallRow / per-kind tool-renderers (and the wire
// `parseArgs`) were deleted in the adopt-fairtrade migration. PhaseDivider /
// TaskBoundary / CheckpointMarker likewise come from the fairtrade
// TranscriptMarkers family; the canvas maps domain data to their props.
export { EmptyState, type EmptyStateProps } from "./EmptyState.js";
export {
  ViewModeToggle,
  type ViewModeToggleProps,
  type TrajectoryMode,
} from "./ViewModeToggle.js";

// Parse-free compact-label helpers (the only survivors of the old tool-renderers
// module — used by the outline rails + highlight/annotation views).
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

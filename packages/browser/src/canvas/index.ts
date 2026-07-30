export {
  TranscriptCanvas,
  type TranscriptCanvasProps,
} from "./TranscriptCanvas.js";
export { TurnRow, type TurnRowProps } from "./TurnRow.js";
export { TurnContent, type TurnContentProps } from "./TurnContent.js";
export { ThinkingBlock, type ThinkingBlockProps } from "./ThinkingBlock.js";
// Single-transcript tool rendering uses the cooked-VM-driven TranscriptToolCall
// and TranscriptToolBody from @peasant-labs/fairtrade/ui. Consumers should import
// those canonical presentation components from fairtrade, which also owns the
// wire-parsing boundary. PhaseDivider, TaskBoundary, and CheckpointMarker likewise
// come from fairtrade's TranscriptMarkers family; the canvas maps domain data to
// their props.
export { EmptyState, type EmptyStateProps } from "./EmptyState.js";
export {
  ViewModeToggle,
  type ViewModeToggleProps,
  type TrajectoryMode,
} from "./ViewModeToggle.js";

// Parse-free compact-label helpers used by the outline rails and
// highlight/annotation views.
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

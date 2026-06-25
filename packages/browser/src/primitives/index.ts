export { CodeBlock, langFromClassName, type CodeBlockProps } from "./CodeBlock.js";
export { Markdown, type MarkdownProps } from "./Markdown.js";
export { DiffView, type DiffViewProps } from "./DiffView.js";
export { ErrorPill, type ErrorPillProps } from "./ErrorPill.js";
export { ToolIcon, type ToolIconProps } from "./ToolIcon.js";
export { RoleGlyph, type GlyphRole, type RoleGlyphProps } from "./RoleGlyph.js";
// ProviderIcon is consumed from @peasant-labs/fairtrade/ui (real brand marks via
// BrandMark + per-provider accent); TB's local ProviderIcon was deleted.
export {
  OutcomeChip,
  collectOutcomeReasons,
  type OutcomeChipProps,
} from "./OutcomeChip.js";

/**
 * @peasant-labs/theme — token name map.
 *
 * The viewer paints exclusively from the `--tb-*` CSS custom properties
 * declared in `tokens.css`. This module exports their canonical names as a
 * typed map so consumers can reference them programmatically (e.g. to bridge
 * the viewer into an app's own theme: `style={{ [themeTokens.canvas]: ... }}`).
 *
 * Tailwind v4 favours CSS-first configuration via `@theme`, so there is no JS
 * config object to export — re-theming is done purely by overriding the CSS
 * variables below.
 */

/** Canonical CSS custom-property names exposed by `tokens.css`. */
export const themeTokens = {
  // Surfaces
  canvas: "--tb-canvas",
  surface: "--tb-surface",
  surfaceHover: "--tb-surface-hover",
  codeBg: "--tb-code-bg",

  // Ink scale
  ink: "--tb-ink",
  ink2: "--tb-ink-2",
  ink3: "--tb-ink-3",
  ink4: "--tb-ink-4",

  // Rules + rail
  rule: "--tb-rule",
  ruleStrong: "--tb-rule-strong",
  rail: "--tb-rail",

  // Accent / focus
  accent: "--tb-accent",
  focus: "--tb-focus",

  // Semantic states
  positive: "--tb-positive",
  positiveSoft: "--tb-positive-soft",
  caution: "--tb-caution",
  cautionSoft: "--tb-caution-soft",
  negative: "--tb-negative",
  negativeSoft: "--tb-negative-soft",

  // Diff
  diffAdd: "--tb-diff-add",
  diffAddText: "--tb-diff-add-text",
  diffAddGutter: "--tb-diff-add-gutter",
  diffAddAccent: "--tb-diff-add-accent",
  diffDel: "--tb-diff-del",
  diffDelText: "--tb-diff-del-text",
  diffDelGutter: "--tb-diff-del-gutter",
  diffDelAccent: "--tb-diff-del-accent",

  // Roles
  roleUser: "--tb-role-user",
  roleUserSoft: "--tb-role-user-soft",
  roleAssistant: "--tb-role-assistant",
  roleAssistantSoft: "--tb-role-assistant-soft",

  // Providers
  providerClaude: "--tb-provider-claude",
  providerGemini: "--tb-provider-gemini",
  providerOpencode: "--tb-provider-opencode",
  providerCodex: "--tb-provider-codex",

  // Typography
  fontSans: "--tb-font-sans",
  fontMono: "--tb-font-mono",
} as const;

export type ThemeTokenName = (typeof themeTokens)[keyof typeof themeTokens];

/** Path to the raw token stylesheet, for consumers wiring up bundlers. */
export const tokensStylesheetPath = "@peasant-labs/theme/tokens.css";

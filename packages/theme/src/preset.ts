/**
 * Tailwind v4 preset placeholder.
 *
 * Tailwind v4 favours CSS-first configuration via `@theme` in a stylesheet
 * over the legacy JS config object. For now this module exports the token
 * names as a typed map so consumers can reference them programmatically; the
 * full `@theme` block / `@plugin` wiring will be filled in once the viewer
 * components land and the real token set is reconciled.
 */

/** Canonical CSS custom-property names exposed by `tokens.css`. */
export const themeTokens = {
  colorBg: "--tb-color-bg",
  colorSurface: "--tb-color-surface",
  colorBorder: "--tb-color-border",
  colorFg: "--tb-color-fg",
  colorFgMuted: "--tb-color-fg-muted",
  colorAccent: "--tb-color-accent",
  colorUser: "--tb-color-user",
  colorAssistant: "--tb-color-assistant",
  colorTool: "--tb-color-tool",
  colorSystem: "--tb-color-system",
  colorPositive: "--tb-color-positive",
  colorNegative: "--tb-color-negative",
  fontSans: "--tb-font-sans",
  fontMono: "--tb-font-mono",
} as const;

export type ThemeTokenName = (typeof themeTokens)[keyof typeof themeTokens];

/** Path to the raw token stylesheet, for consumers wiring up bundlers. */
export const tokensStylesheetPath = "@peasant-labs/theme/tokens.css";

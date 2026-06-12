import type { Provider } from "@peasant-labs/types";

/**
 * Human-readable display labels for the supported providers. Replaces peasant's
 * app-local `PROVIDER_LABEL` (from `lib/sessions/columns`) so the viewer carries
 * its own label map and stays decoupled from the app. Falls back to the raw
 * provider string for any unknown value.
 */
const PROVIDER_LABEL: Record<Provider, string> = {
  "claude-code": "Claude Code",
  "gemini-cli": "Gemini CLI",
  opencode: "OpenCode",
  codex: "Codex",
  cursor: "Cursor",
};

export function providerLabel(provider: Provider | string | undefined): string {
  if (!provider) return "";
  return PROVIDER_LABEL[provider as Provider] ?? String(provider);
}

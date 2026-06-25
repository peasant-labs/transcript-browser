import type { Provider } from "@peasant-labs/types";
import { PROVIDER_LABELS } from "./labels.js";

/**
 * Human-readable display labels for the supported providers — the lowercase
 * harness name shown as the assistant role label. The strings live in the
 * central `lib/labels.ts` source of truth so casing cannot drift. Falls back to
 * the raw provider string for any unknown value.
 */
export function providerLabel(provider: Provider | string | undefined): string {
  if (!provider) return "";
  return PROVIDER_LABELS[provider as Provider] ?? String(provider);
}

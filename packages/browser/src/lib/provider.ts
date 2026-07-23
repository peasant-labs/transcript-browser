import { providerDisplayName } from "@peasant-labs/fairtrade/ui";
import type { Harness } from "@peasant-labs/schema";

/**
 * Human-readable display label for a canonical provider. Fairtrade owns the
 * canonical name; transcript chrome applies its lowercase presentation only
 * after that validated lookup.
 */
export function providerLabel(provider: Harness): string {
  return providerDisplayName(provider).toLocaleLowerCase("en-US");
}

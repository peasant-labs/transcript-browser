/**
 * @peasant-labs/types
 *
 * Shared, framework-agnostic transcript types for AI agent session
 * transcripts. Consumed by peasant/web and village/frontend.
 *
 * This package contains ONLY data shapes that are common to both apps. App- and
 * transport-specific types (WebSocket channel/subscription machinery, REST list
 * wrappers, dashboard/sessions list payloads, redaction-review types) live in
 * their respective apps. See DIVERGENCES.md for what was reconciled and why.
 */

export * from "./enums.js";
export * from "./transcript.js";
export * from "./annotations.js";
export * from "./quality.js";
export * from "./insights.js";
export * from "./analytics.js";

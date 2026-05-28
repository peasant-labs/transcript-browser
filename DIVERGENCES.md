# Type reconciliation: peasant vs. village

This document records how the shared types in `@peasant-labs/types` were lifted
and reconciled from the two source apps.

Sources read (read-only — neither repo was modified):

- `peasant/web/src/types/messages.ts` (+ `web/src/lib/quality/types.ts`,
  `web/src/lib/insights/types.ts`)
- `village/frontend/src/types/messages.ts` (+ `village/frontend/src/lib/types.ts`)

**peasant is the superset.** Where the two diverge, the peasant shape was kept.

## What was lifted into `@peasant-labs/types`

| Type / symbol | Source module | Notes |
|---|---|---|
| `ToolCallKind`, `EntryType`, `StopReason` | `enums.ts` | Identical const-object enums in both apps. |
| `Provider`, `Role` | `enums.ts` | Identical in both apps. |
| `SessionSource`, `SessionStatus` | `enums.ts` | **New named aliases** for the inline `"imported" \| "live"` and `"local" \| "posted"` unions that both apps repeated inline. Pure tidy-up; the literal values are unchanged. |
| `ToolCallDetail`, `TurnDetail` | `transcript.ts` | Byte-for-byte identical in both apps. |
| `SessionCommit`, `SessionGitContext` | `transcript.ts` | Identical. (`SessionGitContext` is exported here; village had it un-exported.) |
| `SessionDetailPayload` | `transcript.ts` | Identical in both apps. |
| `AnnotationSummary` | `annotations.ts` | **peasant only.** Not present in village's `messages.ts`. |
| `QualitySession`, `SessionOutcome`, `SessionLabel`, `DerivedLabels`, `outcomeValueToLabel`, `deriveLabels` | `quality.ts` | **peasant only** (`web/src/lib/quality/types.ts`). The two pure helpers were lifted alongside the shapes they operate on. |
| `Phase`, `PhaseType`, `PhaseBadge` | `insights.ts` | **peasant only** (`web/src/lib/insights/types.ts`). Data shapes only; the `detectPhases` algorithm stays app-side for now. |

## What was deliberately LEFT OUT (app- / transport-specific)

These are not transcript data shapes — they are framework/transport glue that
belongs to each app:

- **WebSocket subscription machinery (peasant only):** `ChannelTopic`,
  `ChannelName`, `AnnotationAxis`, `SubscriptionMessage` + all per-topic
  subscription interfaces, `SubscriptionVisitor`, `acceptSubscription`,
  `subscribe`, `subscriptionKey`, `ServerMessage`, `ClientMessage`.
- **List / aggregate payloads (peasant only):** `DashboardPayload`,
  `SessionSummary`, `SessionsPayload`, `QualityPayload`. These are
  list/transport envelopes, not the per-transcript shape the viewer needs.
- **Redaction-review types (peasant only):** `RedactionCategory`, `Redaction`.
  Tied to peasant's local redaction-review UI.
- **REST wrapper types (village only):** `TranscriptListResponse`,
  `Transcript`, `User`, `Group`, `Tag`, `TagWithCount`, etc. from
  `village/frontend/src/lib/types.ts`. These are village's REST API
  data-transfer objects, explicitly out of scope per the task.

## Genuine divergences found

1. **village's `messages.ts` is a strict subset of peasant's.** It contains
   only `ToolCallKind`, `EntryType`, `StopReason`, `Provider`, `Role`,
   `ToolCallDetail`, `TurnDetail`, `SessionCommit`, `SessionGitContext`, and
   `SessionDetailPayload` — all byte-for-byte identical to peasant. It does
   **not** contain annotations, quality, insights/phase, list payloads,
   subscriptions, or redaction types. No field-level conflicts were found on
   the types both apps share.

2. **Export visibility differs (cosmetic).** In village, `EntryType`,
   `StopReason`, and `SessionGitContext` are declared **un-exported** (local to
   the module), whereas peasant exports them. The shared package exports all of
   them (peasant shape wins).

No conflicting field types, optionality differences, or value-set differences
were found between the two apps on any shared type. The only reconciliation was
extracting the repeated inline `source`/`status` unions into the named
`SessionSource` / `SessionStatus` aliases.

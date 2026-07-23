# Canonical schema migration boundary

The generated `@peasant-labs/schema` package is the sole wire-contract source.
The old hand-maintained compatibility package is deprecated and performs only
a root re-export of that generated package.

Transcript-browser owns presentation-only envelopes such as `Phase`,
`PhaseBadge`, filters, graph records, and cooked Fairtrade view-model inputs. It
does not redefine transcript payloads, enums, WebSocket messages, metadata, or
quality wire records.

Fairtrade's `adaptTranscript` is the only compatibility boundary for historical
nested git input. Browser production consumes the cooked `SessionGitVM` and
`CommitVM`; canonical payloads use flat `gitBranch`, `gitRemote`, and
`workingDirectory`.

The compatibility package must not grow local types, runtime values, helpers,
or UI policy. New wire fields are added to the schema repository and released
there before consumer packages pin them.

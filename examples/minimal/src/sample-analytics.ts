import type { SessionSummary } from "@peasant-labs/analytics";

/**
 * A generated `SessionSummary[]` fixture for the analytics example.
 *
 * Deterministic (seeded PRNG, no `Math.random`) so the example renders the same
 * charts on every reload. Spans ~14 weeks, 6 contributors and 3 projects, with
 * a plausible mix of outcomes, durations, token counts and commit linkage —
 * enough to exercise every metric / chart in `<ProjectOverview>`.
 */

const CONTRIBUTORS = ["ada", "linus", "grace", "dennis", "margaret", "ken"];
const PROJECTS = ["core-api", "web-app", "infra"];
const OUTCOMES: SessionSummary["outcome"][] = [
  "resolved",
  "resolved",
  "resolved",
  "partial",
  "failed",
];

/** Tiny seeded LCG so the fixture is stable across reloads. */
function makeRng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1_664_525 + 1_013_904_223) >>> 0;
    return s / 0xffffffff;
  };
}

function generateSessions(): SessionSummary[] {
  const rng = makeRng(42);
  const sessions: SessionSummary[] = [];
  const start = Date.UTC(2026, 0, 5); // Mon 2026-01-05
  const weekMs = 7 * 86_400_000;
  let n = 0;

  for (let week = 0; week < 14; week++) {
    // Contributor pool grows over time → new-contributor velocity has signal.
    const poolSize = Math.min(CONTRIBUTORS.length, 2 + Math.floor(week / 2));
    // 3–8 sessions per week.
    const count = 3 + Math.floor(rng() * 6);
    for (let i = 0; i < count; i++) {
      const dayOffset = Math.floor(rng() * 7);
      const hour = 8 + Math.floor(rng() * 10);
      const ts = start + week * weekMs + dayOffset * 86_400_000 + hour * 3_600_000;
      const contributorId = CONTRIBUTORS[Math.floor(rng() * poolSize)]!;
      const projectKey = PROJECTS[Math.floor(rng() * PROJECTS.length)]!;
      const outcome = OUTCOMES[Math.floor(rng() * OUTCOMES.length)];
      const commitCount = rng() > 0.45 ? 1 + Math.floor(rng() * 3) : 0;
      sessions.push({
        id: `sess-${n++}`,
        startTime: new Date(ts).toISOString(),
        projectKey,
        contributorId,
        durationMins: 8 + Math.floor(rng() * 75),
        totalTokens: 3_000 + Math.floor(rng() * 45_000),
        turnCount: 4 + Math.floor(rng() * 30),
        toolCallCount: 2 + Math.floor(rng() * 24),
        outcome,
        commitCount,
        signalDensity: Math.round(rng() * 100),
        specQualityScore: Math.round(rng() * 100),
      });
    }
  }
  return sessions;
}

export const sampleSessions: SessionSummary[] = generateSessions();

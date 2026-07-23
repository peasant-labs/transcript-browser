import { describe, expect, it } from "vitest";
import {
  Harness,
  StopReason,
  isHarness,
  isStopReason,
  type TurnDetail,
} from "@peasant-labs/schema";
import { adaptTranscript } from "@peasant-labs/fairtrade/ui";
import { loadAccessibilityFixture } from "./accessibility-fixture.test-helper.js";

type DepthIsRequired = TurnDetail extends { depth: number } ? true : false;
const depthIsRequired: DepthIsRequired = true;

describe("generated schema boundary", () => {
  const fixture = loadAccessibilityFixture();

  it("uses generated runtime values and the required-depth contract", () => {
    expect(depthIsRequired).toBe(true);
    expect(Harness.Antigravity).toBe("antigravity");
    expect(StopReason.MaxTurnRequests).toBe("max_turn_requests");
    expect(StopReason.Refusal).toBe("refusal");
    expect(fixture.cases.some(({ session }) => session.harness === Harness.Antigravity)).toBe(true);
    const reasons = fixture.cases.flatMap(({ session }) => (session.turns ?? []).map((turn) => turn.stopReason));
    expect(reasons).toContain(StopReason.MaxTurnRequests);
    expect(reasons).toContain(StopReason.Refusal);
    expect(fixture.cases.every(({ session }) => isHarness(session.harness))).toBe(true);
    expect(reasons.filter((reason) => reason != null).every(isStopReason)).toBe(true);
  });

  it("normalizes canonical nullable turns and flat git through Fairtrade once", () => {
    for (const { session } of fixture.cases) {
      const vm = adaptTranscript(session);
      expect(vm.turns).toHaveLength(session.turns?.length ?? 0);
      expect(vm.session.harness).toBe(session.harness);
      expect(vm.session.workingDirectory).toBe(session.workingDirectory);
      expect(vm.session.git?.branch).toBe(session.gitBranch);
      expect(vm.session.git?.remote).toBe(session.gitRemote);
    }
  });
});

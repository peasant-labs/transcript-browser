import { describe, expect, it } from "vitest";
import { alignTranscriptRows, type AlignmentDiagnostic } from "./turn-alignment.js";
import { loadTurnAlignmentFixture } from "../turn-alignment-fixture.test-helper.js";

const fixture = loadTurnAlignmentFixture();

describe("alignTranscriptRows", () => {
  for (const testCase of fixture.cases) {
    it(testCase.name, () => {
      for (const { aliasPosition, targetPosition } of testCase.aliasPairs) {
        expect(testCase.displayTurns[aliasPosition]).toBe(testCase.displayTurns[targetPosition]);
      }
      const diagnostics: AlignmentDiagnostic[] = [];
      const rows = alignTranscriptRows({
        displayTurns: testCase.displayTurns,
        vmTurns: testCase.vmTurns,
        mode: testCase.mode,
        onDiagnostic: (diagnostic) => diagnostics.push(diagnostic),
      });
      expect(rows).toEqual(testCase.expectedRows);
      expect(diagnostics).toEqual(testCase.expectedDiagnostics);
    });
  }

  it("rejects count-preserving fixture name mutations", () => {
    for (const mutation of fixture.loaderMutations) {
      const source = fixture.source.replace(mutation.find, mutation.replace);
      expect(() => loadTurnAlignmentFixture(source)).toThrow(new RegExp(mutation.expectedError));
    }
  });
});

import type { ToolCallVM, TurnVM } from "@peasant-labs/fairtrade/ui";
import type { TurnDetail } from "@peasant-labs/schema";

export type TurnRowKey = `${number}:${number}`;
export type RowAlignment = "aligned" | "unaligned";

export interface AlignedTurnRow {
  readonly key: TurnRowKey;
  readonly turn: TurnDetail;
  readonly index: number;
  readonly occurrence: number;
  readonly cooked: TurnVM | null;
  readonly toolVMs: ToolCallVM[] | null;
  readonly alignment: RowAlignment;
}

export interface AlignmentDiagnostic {
  readonly what: string;
  readonly why: string;
  readonly where: string;
  readonly when: string;
  readonly meaning: string;
  readonly fix: string;
}

export interface AlignTranscriptRowsArgs {
  readonly displayTurns: readonly TurnDetail[];
  readonly vmTurns: readonly TurnVM[];
  readonly mode: "replace" | "visible";
  readonly onDiagnostic?: (diagnostic: AlignmentDiagnostic) => void;
}

function occurrenceOrdinals(turns: readonly { index: number }[]): number[] {
  // This counter only names positional occurrences. It never selects cooked
  // data: alignment below remains a verified positional/subsequence operation.
  const counts = new Map<number, number>();
  return turns.map(({ index }) => {
    const occurrence = counts.get(index) ?? 0;
    counts.set(index, occurrence + 1);
    return occurrence;
  });
}

function rowKey(index: number, occurrence: number): TurnRowKey {
  return `${index}:${occurrence}`;
}

function report(
  callback: AlignTranscriptRowsArgs["onDiagnostic"],
  diagnostic: AlignmentDiagnostic,
): void {
  if (callback) {
    callback(diagnostic);
    return;
  }
  if (typeof process !== "undefined" && process.env.NODE_ENV !== "production") {
    const message = [
      `what: ${diagnostic.what}`,
      `why: ${diagnostic.why}`,
      `where: ${diagnostic.where}`,
      `when: ${diagnostic.when}`,
      `meaning: ${diagnostic.meaning}`,
      `fix: ${diagnostic.fix}`,
    ].join("\n");
    console.error(`[transcript-browser] ${message}`);
  }
}

function unalignedRow(
  turn: TurnDetail,
  occurrence: number,
): AlignedTurnRow {
  return {
    key: rowKey(turn.index, occurrence),
    turn,
    index: turn.index,
    occurrence,
    cooked: null,
    toolVMs: null,
    alignment: "unaligned",
  };
}

function alignedRow(
  turn: TurnDetail,
  occurrence: number,
  cooked: TurnVM,
): AlignedTurnRow {
  return {
    key: rowKey(turn.index, occurrence),
    turn,
    index: turn.index,
    occurrence,
    cooked,
    toolVMs: cooked.toolCalls,
    alignment: "aligned",
  };
}

function replacementDiagnostic(
  displayCount: number,
  vmCount: number,
  turn: TurnDetail,
  occurrence: number,
  position: number,
  candidate: TurnVM | undefined,
): AlignmentDiagnostic {
  const key = rowKey(turn.index, occurrence);
  const why = displayCount !== vmCount
    ? `Replacement mode received ${displayCount} display turns but ${vmCount} Fairtrade turns.`
    : `Fairtrade turn index ${candidate?.index ?? "missing"} does not match display turn index ${turn.index} at position ${position}.`;
  return {
    what: "Transcript row alignment failed.",
    why,
    where: `alignTranscriptRows(replace) at display position ${position} (row key ${key}).`,
    when: "While pairing display turns with Fairtrade view-model turns before transcript rendering.",
    meaning: "This row will use the legacy wire renderer without cooked model attribution or cooked tool previews.",
    fix: "Pass the exact replacement turn sequence to adaptTranscript and preserve its positional order before calling alignTranscriptRows.",
  };
}

function visibleRowDiagnostic(
  turn: TurnDetail,
  occurrence: number,
  position: number,
): AlignmentDiagnostic {
  const key = rowKey(turn.index, occurrence);
  return {
    what: "Transcript row alignment failed.",
    why: `No remaining Fairtrade turn matched display row ${key} (index ${turn.index}, occurrence ${occurrence}) in monotone order.`,
    where: `alignTranscriptRows(visible) at display position ${position} (row key ${key}).`,
    when: "While pairing a visible display projection with Fairtrade view-model turns before transcript rendering.",
    meaning: "This row will use the legacy wire renderer without cooked model attribution or cooked tool previews.",
    fix: "Project Fairtrade from the complete payload with visibleTurnIndices that preserves the display sequence and duplicate occurrences.",
  };
}

function visibleRemainderDiagnostic(
  unconsumedCount: number,
  displayCount: number,
): AlignmentDiagnostic {
  return {
    what: "Transcript view-model rows remained after visible alignment.",
    why: `${unconsumedCount} Fairtrade turn(s) were not consumed by the monotone display subsequence.`,
    where: `alignTranscriptRows(visible) after processing ${displayCount} display rows.`,
    when: "After pairing the visible display projection with Fairtrade view-model turns before transcript rendering.",
    meaning: "Unconsumed cooked rows are ignored so they cannot be substituted into unrelated display content.",
    fix: "Ensure the visible projection and display list use the same ordered turn occurrences before rendering.",
  };
}

function matchVisibleRows(
  displayTurns: readonly TurnDetail[],
  displayOccurrences: readonly number[],
  vmTurns: readonly TurnVM[],
  vmOccurrences: readonly number[],
): Array<number | null> {
  const matches: Array<number | null> = [];
  let cursor = 0;
  for (let position = 0; position < displayTurns.length; position += 1) {
    const turn = displayTurns[position]!;
    const occurrence = displayOccurrences[position]!;
    let matchedPosition: number | null = null;
    for (let vmPosition = cursor; vmPosition < vmTurns.length; vmPosition += 1) {
      if (vmTurns[vmPosition]!.index === turn.index && vmOccurrences[vmPosition] === occurrence) {
        matchedPosition = vmPosition;
        cursor = vmPosition + 1;
        break;
      }
    }
    matches.push(matchedPosition);
  }
  return matches;
}

/**
 * Pair wire rows with Fairtrade view models without guessing by object identity
 * or substituting another turn. A failed pair deliberately carries no cooked
 * data so the retained wire renderer remains the fail-closed path.
 */
export function alignTranscriptRows({
  displayTurns,
  vmTurns,
  mode,
  onDiagnostic,
}: AlignTranscriptRowsArgs): AlignedTurnRow[] {
  const displayOccurrences = occurrenceOrdinals(displayTurns);

  if (mode === "replace") {
    const sameLength = displayTurns.length === vmTurns.length;
    return displayTurns.map((turn, position) => {
      const occurrence = displayOccurrences[position]!;
      const candidate = vmTurns[position];
      const aligned = sameLength && candidate !== undefined && candidate.index === turn.index;
      if (aligned) return alignedRow(turn, occurrence, candidate);
      report(
        onDiagnostic,
        replacementDiagnostic(
          displayTurns.length,
          vmTurns.length,
          turn,
          occurrence,
          position,
          candidate,
        ),
      );
      return unalignedRow(turn, occurrence);
    });
  }

  const vmOccurrences = occurrenceOrdinals(vmTurns);
  const fullMatches = matchVisibleRows(displayTurns, displayOccurrences, vmTurns, vmOccurrences);
  const projectedOccurrences = occurrenceOrdinals(displayTurns);
  const projectedMatches = matchVisibleRows(displayTurns, projectedOccurrences, vmTurns, vmOccurrences);
  const fullMatchCount = fullMatches.filter((match) => match !== null).length;
  const projectedMatchCount = projectedMatches.filter((match) => match !== null).length;
  const matches = projectedMatchCount > fullMatchCount ? projectedMatches : fullMatches;
  const rows: AlignedTurnRow[] = [];

  for (let position = 0; position < displayTurns.length; position += 1) {
    const turn = displayTurns[position]!;
    const occurrence = displayOccurrences[position]!;
    const matchedPosition = matches[position];

    if (matchedPosition === null || matchedPosition === undefined) {
      report(onDiagnostic, visibleRowDiagnostic(turn, occurrence, position));
      rows.push(unalignedRow(turn, occurrence));
      continue;
    }

    rows.push(alignedRow(turn, occurrence, vmTurns[matchedPosition]!));
  }

  const unconsumedCount = vmTurns.length - matches.filter((match) => match !== null).length;
  const unmatchedDisplayCount = matches.filter((match) => match === null).length;
  if (unmatchedDisplayCount === 0 && unconsumedCount > 0) {
    report(onDiagnostic, visibleRemainderDiagnostic(unconsumedCount, displayTurns.length));
  }

  return rows;
}

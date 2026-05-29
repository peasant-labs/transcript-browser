import type { TurnDetail } from "@peasant-labs/types";

/**
 * Client-side pattern detection over a transcript. Ported verbatim from
 * peasant's `lib/session-detail/pattern-detection.ts`. Pure, framework-agnostic
 * data transform — no fetching, no app coupling.
 *
 * This is exported so the host can call `annotateTranscript(turns)` itself and
 * feed the result to `<AnnotationsView>` / the annotation rails / the graph.
 * The shared viewer never runs it implicitly; the host owns when (and whether)
 * to derive these annotations.
 */
export interface TranscriptAnnotation {
  turnIndex: number;
  type: "retry" | "error" | "revert" | "subagent";
  label: string;
  severity: "info" | "warning" | "error";
}

const SUBAGENT_TOOLS = new Set([
  "Task",
  "EnterWorktree",
  "SendMessage",
  "TeamCreate",
]);
const FILE_CHANGE_TOOLS = new Set(["Write", "Edit", "NotebookEdit"]);

function isFileChangeTool(name: string): boolean {
  return FILE_CHANGE_TOOLS.has(name);
}

function isSubagentTool(name: string): boolean {
  return SUBAGENT_TOOLS.has(name);
}

function getFilePath(toolCall: { name: string; arguments: string }): string | null {
  if (!isFileChangeTool(toolCall.name)) return null;
  try {
    const args = JSON.parse(toolCall.arguments) as {
      file_path?: string;
      notebook_path?: string;
    };
    return args.file_path ?? args.notebook_path ?? null;
  } catch {
    // Arguments might not be JSON — try to extract a path pattern.
    const match = toolCall.arguments.match(
      /"(?:file_path|notebook_path)"\s*:\s*"([^"]+)"/,
    );
    return match?.[1] ?? null;
  }
}

/**
 * Walk a transcript and surface error / retry / revert / subagent moments.
 * Returns annotations sorted by display position (`turnIndex`).
 */
export function annotateTranscript(turns: TurnDetail[]): TranscriptAnnotation[] {
  const annotations: TranscriptAnnotation[] = [];
  const recentToolCalls: { name: string; index: number }[] = [];
  const fileEditTurns = new Map<string, number[]>();

  for (let i = 0; i < turns.length; i++) {
    const turn = turns[i]!;
    if (!turn.toolCalls) continue;

    for (const tc of turn.toolCalls) {
      if (tc.isError || (tc.exitCode !== undefined && tc.exitCode !== 0)) {
        annotations.push({
          turnIndex: i,
          type: "error",
          label: `${tc.name} failed`,
          severity: "error",
        });
      }

      // Subagent calls.
      if (isSubagentTool(tc.name)) {
        annotations.push({
          turnIndex: i,
          type: "subagent",
          label: `Subagent: ${tc.name}`,
          severity: "info",
        });
      }

      // Track file edits for revert detection.
      const filePath = getFilePath(tc);
      if (filePath) {
        const editTurns = fileEditTurns.get(filePath) ?? [];
        editTurns.push(i);
        fileEditTurns.set(filePath, editTurns);
      }

      // Retry detection (within 5 display positions).
      const recent = recentToolCalls.filter(
        (r) => i - r.index <= 5 && r.name === tc.name,
      );
      if (recent.length >= 2) {
        annotations.push({
          turnIndex: i,
          type: "retry",
          label: "Retry loop",
          severity: "warning",
        });
        recentToolCalls.length = 0;
      }
      recentToolCalls.push({ name: tc.name, index: i });
    }
  }

  // Mark revert annotations (file edited in multiple turns).
  for (const [filePath, turnIndices] of fileEditTurns) {
    if (turnIndices.length > 1) {
      const lastTurn = turnIndices[turnIndices.length - 1]!;
      const fileName = filePath.split("/").pop() ?? filePath;
      annotations.push({
        turnIndex: lastTurn,
        type: "revert",
        label: `Re-edit: ${fileName}`,
        severity: "warning",
      });
    }
  }

  return annotations.sort((a, b) => a.turnIndex - b.turnIndex);
}

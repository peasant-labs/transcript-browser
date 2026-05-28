import type { Phase, SessionDetailPayload } from "@peasant-labs/types";

/**
 * A realistic hand-written sample, typed against the shared
 * SessionDetailPayload. Exercises the full canvas: user/assistant turns, a
 * thinking turn, several tool calls (Read, Bash w/ non-zero exit, Edit diff,
 * Grep), a tool error, a subagent turn, multiple user turns (so task
 * boundaries appear), and a final resolved outcome.
 */
export const sampleSession: SessionDetailPayload = {
  id: "sess_demo_0001",
  provider: "claude",
  startTime: "2026-05-28T10:00:00Z",
  endTime: "2026-05-28T10:08:30Z",
  durationMins: 8.5,
  totalTokens: 18420,
  tokensIn: 12200,
  tokensOut: 6220,
  turnCount: 8,
  toolCallCount: 5,
  project: "transcript-browser",
  model: "claude-opus-4-7",
  outcome: "resolved",
  workingDirectory: "/Users/dev/transcript-browser",
  gitContext: {
    branch: "feat/canvas",
    user: "Dev",
    email: "dev@example.com",
    remote: "git@github.com:peasant-labs/transcript-browser.git",
    workingDirectory: "/Users/dev/transcript-browser",
    startCommit: "a1b2c3d",
    commits: [
      {
        hash: "9f3c1ad8e2",
        message: "feat(canvas): port TurnRow + tool renderers",
        timestamp: "2026-05-28T10:05:10Z",
        filesChanged: 7,
        insertions: 312,
        deletions: 24,
      },
    ],
  },
  turns: [
    {
      index: 0,
      role: "user",
      content:
        "Port the transcript canvas into the shared package. Start by reading the existing renderer.",
      timestamp: "2026-05-28T10:00:00Z",
      entryType: "text",
    },
    {
      index: 1,
      role: "assistant",
      content: "Let me look at the current renderer before extracting it.",
      timestamp: "2026-05-28T10:00:20Z",
      entryType: "thinking",
      hasThinking: true,
      tokensIn: 1200,
      tokensOut: 180,
    },
    {
      index: 2,
      role: "assistant",
      content: "I read the file and the tool-renderer registry.",
      timestamp: "2026-05-28T10:00:55Z",
      entryType: "tool_use",
      tokensIn: 4200,
      tokensOut: 640,
      toolCalls: [
        {
          id: "tc_read_1",
          name: "Read",
          toolKind: "read",
          filePath: "web/src/components/session-detail/v2/canvas/TurnRow.tsx",
          arguments: '{"file_path":"web/.../canvas/TurnRow.tsx","offset":1,"limit":40}',
          result:
            "export function TurnRow({ turn }: TurnRowProps) {\n  const subagent = turn.role === 'assistant';\n  return <article className=\"turn\">...</article>;\n}",
          durationMs: 240,
        },
        {
          id: "tc_grep_1",
          name: "Grep",
          toolKind: "search",
          arguments: '{"pattern":"rendererFor","path":"web/src","glob":"*.ts"}',
          result:
            "canvas/tool-renderers/index.ts:18:export function rendererFor(call) {\ncanvas/ToolCallRow.tsx:9:import { rendererFor } from './tool-renderers';",
          durationMs: 90,
        },
      ],
    },
    {
      index: 3,
      role: "assistant",
      content: "Running the test suite to capture the baseline.",
      timestamp: "2026-05-28T10:02:10Z",
      entryType: "tool_use",
      tokensIn: 2100,
      tokensOut: 320,
      toolCalls: [
        {
          id: "tc_bash_1",
          name: "Bash",
          toolKind: "execute",
          arguments: '{"command":"pnpm -r typecheck","description":"Typecheck all packages"}',
          result:
            "src/lib/tasks.ts(48,9): error TS2532: Object is possibly 'undefined'.\nExit status 2",
          exitCode: 2,
          isError: true,
          durationMs: 4200,
        },
      ],
    },
    {
      index: 4,
      role: "assistant",
      content: "Fixing the strict-mode index access, then re-running.",
      timestamp: "2026-05-28T10:03:30Z",
      entryType: "tool_use",
      tokensIn: 1800,
      tokensOut: 520,
      toolCalls: [
        {
          id: "tc_edit_1",
          name: "Edit",
          toolKind: "edit",
          filePath: "packages/browser/src/lib/tasks.ts",
          arguments: JSON.stringify({
            file_path: "packages/browser/src/lib/tasks.ts",
            old_string:
              "  for (let i = 0; i < turns.length; i++) {\n    if (turns[i].role === 'user') {",
            new_string:
              "  for (let i = 0; i < turns.length; i++) {\n    const t = turns[i]!;\n    if (t.role === 'user') {",
          }),
          result: "",
          durationMs: 60,
        },
      ],
    },
    {
      index: 5,
      role: "assistant",
      content: "Delegating the README contract write-up to a subagent.",
      timestamp: "2026-05-28T10:04:40Z",
      entryType: "tool_use",
      depth: 0,
      tokensIn: 900,
      tokensOut: 140,
      toolCalls: [
        {
          id: "tc_task_1",
          name: "Task",
          toolKind: "other",
          arguments: JSON.stringify({
            description: "Document the props/callback/capability contract",
            subagent_type: "docs-writer",
            prompt:
              "Write the README section describing the agnosticism contract: data in via props, actions out via callbacks + capability flags.",
          }),
          result: "Drafted README.md contract section (78 lines).",
          durationMs: 18200,
        },
      ],
    },
    {
      index: 6,
      role: "assistant",
      content:
        "Documented the contract: every callback and capability flag is optional, so the viewer renders read-only by default.",
      timestamp: "2026-05-28T10:06:05Z",
      entryType: "text",
      depth: 1,
      agentName: "docs-writer",
      tokensIn: 600,
      tokensOut: 380,
    },
    {
      index: 7,
      role: "assistant",
      content:
        "All packages typecheck and build. The canvas renders the sample session end to end.\n\n```bash\npnpm -r build && pnpm -r typecheck\n```",
      timestamp: "2026-05-28T10:08:30Z",
      entryType: "result",
      stopReason: "end_turn",
      tokensIn: 400,
      tokensOut: 320,
    },
  ],
};

/** Optional phase overlay — drives the sticky phase dividers. */
export const samplePhases: Phase[] = [
  { type: "exploration", startTurn: 0, endTurn: 2, badges: [] },
  { type: "debug", startTurn: 3, endTurn: 4, badges: [{ type: "error", count: 1 }] },
  { type: "implementation", startTurn: 5, endTurn: 7, badges: [] },
];

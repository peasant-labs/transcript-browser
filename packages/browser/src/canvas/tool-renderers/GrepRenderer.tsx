import { CodeBlock } from "../../primitives/CodeBlock.js";
import { ErrorPill } from "../../primitives/ErrorPill.js";
import { parseArgs, type ToolRendererProps } from "./types.js";

interface GrepArgs {
  pattern?: string;
  path?: string;
  glob?: string;
  type?: string;
  output_mode?: string;
  "-i"?: boolean;
  multiline?: boolean;
}

/**
 * `Grep` / `Glob` / search-style tool renderer — shows the pattern, scope, and
 * the matches output below as plain monospace (typically file paths or grep
 * output with line numbers).
 */
export function GrepRenderer({ call }: ToolRendererProps) {
  const args = parseArgs<GrepArgs>(call.arguments) ?? {};
  const pattern = args.pattern ?? "";
  const scope = args.path ?? args.glob ?? ".";
  const result = call.result ?? "";
  const matchLines = result.trim() ? result.trim().split("\n").length : 0;

  return (
    <div className="tb-stack">
      <div className="tb-grepline">
        <span className="tb-grepline-label">pattern</span>
        <code className="tb-grepline-pattern">{pattern || "(empty)"}</code>
        <span className="tb-grepline-label">in</span>
        <span className="tb-grepline-scope">{scope}</span>
        {args.type && <span className="tb-grepline-label">·</span>}
        {args.type && <span className="tb-grepline-type">type={args.type}</span>}
        <span className="tb-grepline-count">
          {matchLines} {matchLines === 1 ? "match" : "matches"}
        </span>
        {call.isError && <ErrorPill />}
      </div>
      {result.trim() && <CodeBlock code={result} lang="text" maxLines={16} />}
    </div>
  );
}

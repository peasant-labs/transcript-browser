import { CodeBlock } from "../../primitives/CodeBlock.js";
import { ErrorPill } from "../../primitives/ErrorPill.js";
import { DurationBadge } from "../../primitives/DurationBadge.js";
import { parseArgs, type ToolRendererProps } from "./types.js";

/**
 * Catch-all renderer for tool calls without a dedicated layout. Shows
 * pretty-printed args + result as code blocks.
 */
export function DefaultRenderer({ call }: ToolRendererProps) {
  const argsObj = parseArgs(call.arguments);
  const argsText = argsObj ? JSON.stringify(argsObj, null, 2) : call.arguments;
  const result = call.result;

  return (
    <div className="tb-stack">
      <div className="tb-default-head">
        <span className="tb-default-head-name">{call.name}</span>
        <DurationBadge ms={call.durationMs} />
        {call.isError && <ErrorPill />}
      </div>
      {argsText?.trim() && (
        <div>
          <div className="tb-eyebrow tb-default-section-label">Arguments</div>
          <CodeBlock code={argsText} lang="json" maxLines={12} />
        </div>
      )}
      {result?.trim() && (
        <div>
          <div className="tb-eyebrow tb-default-section-label">Result</div>
          <CodeBlock code={result} lang="text" maxLines={16} />
        </div>
      )}
    </div>
  );
}

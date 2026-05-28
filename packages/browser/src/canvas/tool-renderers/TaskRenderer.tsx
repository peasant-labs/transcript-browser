import { Markdown } from "../../primitives/Markdown.js";
import { ErrorPill } from "../../primitives/ErrorPill.js";
import { parseArgs, preview, type ToolRendererProps } from "./types.js";

interface TaskArgs {
  // Task tool
  description?: string;
  prompt?: string;
  subagent_type?: string;
  // TaskCreate / TaskUpdate
  subject?: string;
  activeForm?: string;
  status?: string;
  taskId?: string;
  owner?: string;
}

/**
 * Renderer for Task / TaskCreate / TaskUpdate / TodoWrite — structured
 * key/value display for the typical fields, plus a markdown body for the
 * prompt/description.
 */
export function TaskRenderer({ call }: ToolRendererProps) {
  const args = parseArgs<TaskArgs>(call.arguments) ?? {};
  const heading = args.subject ?? args.description ?? args.taskId ?? call.name;
  const body = args.prompt ?? "";
  const meta: { k: string; v: string }[] = [];
  if (args.subagent_type) meta.push({ k: "agent", v: args.subagent_type });
  if (args.status) meta.push({ k: "status", v: args.status });
  if (args.taskId) meta.push({ k: "task", v: args.taskId });
  if (args.owner) meta.push({ k: "owner", v: args.owner });
  if (args.activeForm) meta.push({ k: "doing", v: args.activeForm });

  return (
    <div className="tb-task">
      <div className="tb-task-head">
        <span className="tb-task-heading">{preview(heading, 120)}</span>
        {call.isError && <ErrorPill />}
      </div>
      {meta.length > 0 && (
        <dl className="tb-task-meta">
          {meta.map((m, i) => (
            <span key={i} className="tb-task-meta-item">
              <dt>{m.k}:</dt>
              <dd>{m.v}</dd>
            </span>
          ))}
        </dl>
      )}
      {body.trim() && <Markdown>{body}</Markdown>}
      {call.result?.trim() && (
        <details className="tb-task-result">
          <summary>Result</summary>
          <pre>{call.result}</pre>
        </details>
      )}
    </div>
  );
}

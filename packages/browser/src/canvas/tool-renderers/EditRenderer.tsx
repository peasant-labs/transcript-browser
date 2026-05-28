import { DiffView } from "../../primitives/DiffView.js";
import { ErrorPill } from "../../primitives/ErrorPill.js";
import { parseArgs, type ToolRendererProps } from "./types.js";

interface EditArgs {
  file_path?: string;
  old_string?: string;
  new_string?: string;
  replace_all?: boolean;
}

interface MultiEditArgs {
  file_path?: string;
  edits?: { old_string: string; new_string: string; replace_all?: boolean }[];
}

/**
 * `Edit` / `MultiEdit` / `NotebookEdit` — inline +/- diff. The only place
 * red/green tints appear in the design.
 */
export function EditRenderer({ call }: ToolRendererProps) {
  const single = parseArgs<EditArgs>(call.arguments) ?? {};
  const multi = parseArgs<MultiEditArgs>(call.arguments);
  const filePath = call.filePath ?? single.file_path ?? multi?.file_path;

  const edits =
    multi?.edits && Array.isArray(multi.edits) && multi.edits.length > 0
      ? multi.edits
      : single.old_string != null || single.new_string != null
        ? [{ old_string: single.old_string ?? "", new_string: single.new_string ?? "" }]
        : [];

  return (
    <div className="tb-stack">
      {call.isError && (
        <div className="tb-fileline">
          <ErrorPill />
          <span className="tb-fileline-path" style={{ color: "var(--tb-negative)" }}>
            {call.result || "Edit failed"}
          </span>
        </div>
      )}
      {edits.map((e, i) => (
        <DiffView
          key={i}
          oldText={e.old_string}
          newText={e.new_string}
          filePath={i === 0 ? filePath : undefined}
        />
      ))}
      {edits.length === 0 && (
        <div className="tb-fileline tb-fileline-meta">No diff available</div>
      )}
    </div>
  );
}

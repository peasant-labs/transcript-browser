import { CodeBlock } from "../../primitives/CodeBlock.js";
import { ErrorPill } from "../../primitives/ErrorPill.js";
import { basename, langFromPath, parseArgs, type ToolRendererProps } from "./types.js";

interface WriteArgs {
  file_path?: string;
  content?: string;
}

/**
 * `Write` tool renderer — file header + the full file content,
 * syntax-highlighted, capped at 20 lines with a "more lines hidden" footer.
 */
export function WriteRenderer({ call }: ToolRendererProps) {
  const args = parseArgs<WriteArgs>(call.arguments) ?? {};
  const path = call.filePath ?? args.file_path ?? "(unknown)";
  const content = args.content ?? "";

  return (
    <div className="tb-stack">
      <div className="tb-fileline">
        <span className="tb-fileline-path">{path}</span>
        {content && (
          <span className="tb-fileline-meta">{content.split("\n").length} lines</span>
        )}
        {call.isError && <ErrorPill />}
      </div>
      {content && (
        <CodeBlock code={content} lang={langFromPath(path)} filename={basename(path)} maxLines={20} />
      )}
    </div>
  );
}

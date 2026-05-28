import { CodeBlock } from "../../primitives/CodeBlock.js";
import { ErrorPill } from "../../primitives/ErrorPill.js";
import { basename, langFromPath, parseArgs, type ToolRendererProps } from "./types.js";

interface ReadArgs {
  file_path?: string;
  offset?: number;
  limit?: number;
}

/**
 * `Read` tool renderer — file header showing the path and optional line range,
 * plus a syntax-highlighted excerpt of the result body.
 */
export function ReadRenderer({ call }: ToolRendererProps) {
  const args = parseArgs<ReadArgs>(call.arguments) ?? {};
  const path = call.filePath ?? args.file_path ?? "(unknown)";
  const range =
    args.offset != null || args.limit != null
      ? `lines ${args.offset ?? 1}–${(args.offset ?? 1) + (args.limit ?? 0) - 1}`
      : undefined;
  const result = stripCatN(call.result);

  return (
    <div className="tb-stack">
      <div className="tb-fileline">
        <span className="tb-fileline-path">{path}</span>
        {range && <span className="tb-fileline-meta">{range}</span>}
        {call.isError && <ErrorPill />}
      </div>
      {result && (
        <CodeBlock code={result} lang={langFromPath(path)} filename={basename(path)} maxLines={20} />
      )}
    </div>
  );
}

/** Strip `cat -n`-style left-aligned line numbers the Read tool prepends. */
function stripCatN(s: string): string {
  if (!s) return "";
  return s
    .split("\n")
    .map((line) => line.replace(/^\s*\d+\t/, ""))
    .join("\n");
}

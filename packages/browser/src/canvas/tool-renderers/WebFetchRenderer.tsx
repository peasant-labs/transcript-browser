import { Globe } from "lucide-react";
import { Markdown } from "../../primitives/Markdown.js";
import { ErrorPill } from "../../primitives/ErrorPill.js";
import { parseArgs, type ToolRendererProps } from "./types.js";

interface WebFetchArgs {
  url?: string;
  prompt?: string;
  query?: string;
}

/**
 * `WebFetch` / `WebSearch` / `Read Website` renderer — URL header + prompt,
 * then the fetched markdown rendered as prose.
 */
export function WebFetchRenderer({ call }: ToolRendererProps) {
  const args = parseArgs<WebFetchArgs>(call.arguments) ?? {};
  const url = args.url ?? "";
  const prompt = args.prompt ?? args.query;
  const body = call.result ?? "";

  return (
    <div className="tb-stack">
      <div className="tb-webfetch-head">
        <Globe size={12} strokeWidth={1.75} />
        {url ? (
          <a href={url} target="_blank" rel="noopener noreferrer" className="tb-webfetch-url">
            {url}
          </a>
        ) : (
          <span className="tb-webfetch-empty">no URL</span>
        )}
        {call.isError && <ErrorPill />}
      </div>
      {prompt && <p className="tb-desc">{prompt}</p>}
      {body.trim() && (
        <div className="tb-webfetch-body">
          <Markdown>{body}</Markdown>
        </div>
      )}
    </div>
  );
}

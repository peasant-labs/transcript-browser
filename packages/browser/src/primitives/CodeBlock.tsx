import { useEffect, useState, type CSSProperties } from "react";
import { codeToTokens } from "shiki";
import { cn } from "../internal/cn.js";

export interface CodeBlockProps {
  code: string;
  /** Shiki language id (e.g. "ts", "tsx", "go", "json", "bash"). */
  lang?: string;
  /** Maximum rendered lines before scrolling; 0 = unlimited. */
  maxLines?: number;
  className?: string;
  /** Optional file path / label shown in the header. */
  filename?: string;
  /** Show line numbers. */
  showLineNumbers?: boolean;
}

/**
 * Syntax-highlighted code block using Shiki, dual-themed against
 * `github-light` and `github-dark`. Renders an unstyled `<pre>` fallback
 * before highlighting resolves, so layout doesn't shift. Theme selection is
 * driven by the `[data-theme="dark"]` ancestor class (see styles.css), so the block
 * follows the viewer's theme with no extra wiring.
 */
export function CodeBlock({
  code,
  lang = "text",
  maxLines = 0,
  className,
  filename,
  showLineNumbers,
}: CodeBlockProps) {
  const [tokens, setTokens] = useState<Awaited<ReturnType<typeof codeToTokens>> | null>(null);

  useEffect(() => {
    let cancelled = false;
    codeToTokens(code, {
      lang: normalizeLang(lang) as never,
      themes: { light: "github-light", dark: "github-dark" },
    })
      .then((result) => {
        if (!cancelled) setTokens(result);
      })
      .catch(() => {
        // Unsupported language — fall back to plain rendering.
        if (!cancelled) setTokens(null);
      });
    return () => {
      cancelled = true;
    };
  }, [code, lang]);

  const lineCount = code.split("\n").length;
  const capLines = maxLines > 0 && lineCount > maxLines;

  return (
    <div className={cn("tb-codeblock", showLineNumbers && "tb-with-line-numbers", className)}>
      {filename && (
        <div className="tb-codeblock-header">
          <span className="tb-codeblock-filename">{filename}</span>
          {lineCount > 1 && (
            <span className="tb-codeblock-lines">{lineCount} lines</span>
          )}
        </div>
      )}
      <div
        className="tb-codeblock-host"
        style={
          capLines ? { maxHeight: `${maxLines * 1.55}em`, overflowY: "auto" } : undefined
        }
      >
        {tokens ? (
          <pre>
            {tokens.tokens.map((line, lineIndex) => (
              <span key={lineIndex}>
                {line.map((token, tokenIndex) => (
                  <span key={tokenIndex} style={token.htmlStyle as CSSProperties}>{token.content}</span>
                ))}
                {lineIndex < tokens.tokens.length - 1 ? "\n" : null}
              </span>
            ))}
          </pre>
        ) : (
          <pre>{code}</pre>
        )}
      </div>
    </div>
  );
}

/** Map common provider tool extensions to Shiki language ids. */
function normalizeLang(lang: string): string {
  const l = lang.trim().toLowerCase();
  if (!l) return "text";
  switch (l) {
    case "sh":
    case "shell":
      return "bash";
    case "tsx":
      return "tsx";
    case "ts":
      return "typescript";
    case "jsx":
      return "jsx";
    case "js":
    case "mjs":
    case "cjs":
      return "javascript";
    case "py":
      return "python";
    case "rb":
      return "ruby";
    case "rs":
      return "rust";
    case "go":
      return "go";
    case "md":
      return "markdown";
    case "yml":
    case "yaml":
      return "yaml";
    case "json":
    case "jsonl":
      return "json";
    case "css":
      return "css";
    case "scss":
      return "scss";
    case "html":
      return "html";
    case "sql":
      return "sql";
    case "toml":
      return "toml";
    default:
      return l;
  }
}

/** Helper for the markdown renderer — extract a language id from a className. */
export function langFromClassName(className?: string): string {
  if (!className) return "text";
  const m = /language-([\w+-]+)/i.exec(className);
  return m ? m[1]! : "text";
}

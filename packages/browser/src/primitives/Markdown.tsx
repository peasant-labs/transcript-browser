import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { CodeBlock, langFromClassName } from "./CodeBlock.js";
import { cn } from "../internal/cn.js";

export interface MarkdownProps {
  children: string;
  className?: string;
}

const components: Components = {
  // Anchor: keep underline, open external links in a new tab.
  a({ href, children, ...rest }) {
    const external = !!href && /^https?:/.test(href);
    return (
      <a
        href={href}
        {...rest}
        target={external ? "_blank" : undefined}
        rel={external ? "noopener noreferrer" : undefined}
      >
        {children}
      </a>
    );
  },
  // Route fenced blocks (which carry a `language-*` className) through Shiki.
  // Inline code (no language class) falls back to the .tb-prose styles.
  code({ className, children, ...rest }) {
    const isFenced = /\blanguage-/.test(className ?? "");
    if (!isFenced) {
      return (
        <code className={className} {...rest}>
          {children}
        </code>
      );
    }
    const code = String(children ?? "").replace(/\n$/, "");
    return (
      <CodeBlock
        code={code}
        lang={langFromClassName(className)}
        className="tb-md-codeblock"
      />
    );
  },
  // react-markdown wraps fenced code in <pre><code>; we render CodeBlock from
  // <code>, so the wrapping <pre> can be unstyled here.
  pre({ children }) {
    return <>{children}</>;
  },
};

/**
 * Renders markdown text inside `.tb-prose` styles. GitHub-flavoured (tables,
 * task lists, strikethrough). Fenced code blocks are syntax-highlighted.
 */
export function Markdown({ children, className }: MarkdownProps) {
  return (
    <div className={cn("tb-prose", className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {children}
      </ReactMarkdown>
    </div>
  );
}

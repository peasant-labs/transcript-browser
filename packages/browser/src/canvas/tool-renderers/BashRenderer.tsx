import { Terminal } from "lucide-react";
import { cn } from "../../internal/cn.js";
import { DurationBadge } from "../../primitives/DurationBadge.js";
import { ErrorPill } from "../../primitives/ErrorPill.js";
import { parseArgs, type ToolRendererProps } from "./types.js";

interface BashArgs {
  command?: string;
  description?: string;
  timeout?: number;
  run_in_background?: boolean;
}

/**
 * `Bash` / `RunCommand` renderer — command in a terminal-styled mono block;
 * output below, with an exit-code badge at the bottom-right.
 */
export function BashRenderer({ call }: ToolRendererProps) {
  const args = parseArgs<BashArgs>(call.arguments) ?? {};
  const command = args.command ?? "";
  const description = args.description;
  const output = call.result ?? "";
  const failed = call.isError || (call.exitCode != null && call.exitCode !== 0);

  return (
    <div className="tb-stack">
      {description && <p className="tb-desc">{description}</p>}

      <div className="tb-bash">
        <div className="tb-bash-cmd">
          <Terminal size={12} strokeWidth={1.75} className="tb-bash-cmd-icon" />
          <pre>{command}</pre>
        </div>
      </div>

      {output.trim() && (
        <div className="tb-bash-out">
          <div className="tb-bash-out-head">
            <span className="tb-eyebrow">stdout</span>
            <div className="tb-bash-out-meta">
              <DurationBadge ms={call.durationMs} />
              {call.exitCode != null && (
                <span
                  className={cn("tb-exitbadge", failed && "tb-exitbadge-failed")}
                  title={`exit code ${call.exitCode}`}
                >
                  <span className="tb-eyebrow">Exit</span>
                  <span className="tb-exitbadge-num">{call.exitCode}</span>
                </span>
              )}
              {call.isError && <ErrorPill />}
            </div>
          </div>
          <pre>{output}</pre>
        </div>
      )}
    </div>
  );
}

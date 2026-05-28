import type { ComponentType } from "react";
import type { ToolCallDetail } from "@peasant-labs/types";
import { ToolCallKind } from "@peasant-labs/types";
import { ReadRenderer } from "./ReadRenderer.js";
import { EditRenderer } from "./EditRenderer.js";
import { WriteRenderer } from "./WriteRenderer.js";
import { BashRenderer } from "./BashRenderer.js";
import { GrepRenderer } from "./GrepRenderer.js";
import { WebFetchRenderer } from "./WebFetchRenderer.js";
import { TaskRenderer } from "./TaskRenderer.js";
import { DefaultRenderer } from "./DefaultRenderer.js";
import type { ToolRendererProps } from "./types.js";

/**
 * Resolve a tool name (and optional toolKind classification) to its renderer.
 * Falls back to the JSON-args DefaultRenderer when no specialised renderer
 * applies.
 */
export function rendererFor(call: ToolCallDetail): ComponentType<ToolRendererProps> {
  const n = call.name.toLowerCase();

  if (n === "read" || n === "notebookread") return ReadRenderer;
  if (n === "edit" || n === "multiedit" || n === "notebookedit") return EditRenderer;
  if (n === "write") return WriteRenderer;
  if (n === "bash" || n === "runcommand" || n === "run_command" || n === "shell")
    return BashRenderer;
  if (n === "grep" || n === "glob" || n === "globsearch") return GrepRenderer;
  if (n === "websearch" || n === "web_search") return GrepRenderer;
  if (n === "webfetch" || n === "web_fetch" || n === "fetch" || n === "readwebsite")
    return WebFetchRenderer;
  if (
    n === "task" ||
    n === "taskcreate" ||
    n === "taskupdate" ||
    n === "task_create" ||
    n === "task_update" ||
    n === "todowrite" ||
    n === "agent"
  )
    return TaskRenderer;

  switch (call.toolKind) {
    case ToolCallKind.Read:
      return ReadRenderer;
    case ToolCallKind.Edit:
      return EditRenderer;
    case ToolCallKind.Search:
      return GrepRenderer;
    case ToolCallKind.Execute:
      return BashRenderer;
    case ToolCallKind.Fetch:
      return WebFetchRenderer;
    default:
      return DefaultRenderer;
  }
}

export { ReadRenderer } from "./ReadRenderer.js";
export { EditRenderer } from "./EditRenderer.js";
export { WriteRenderer } from "./WriteRenderer.js";
export { BashRenderer } from "./BashRenderer.js";
export { GrepRenderer } from "./GrepRenderer.js";
export { WebFetchRenderer } from "./WebFetchRenderer.js";
export { TaskRenderer } from "./TaskRenderer.js";
export { DefaultRenderer } from "./DefaultRenderer.js";
export type { ToolRendererProps } from "./types.js";
export { parseArgs, preview, basename, langFromPath } from "./types.js";

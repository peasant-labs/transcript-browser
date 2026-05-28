import {
  BookOpen,
  Pencil,
  FilePlus2,
  Terminal,
  Search,
  Globe,
  Brain,
  ListChecks,
  GitBranch,
  Wrench,
  Trash2,
  ArrowRight,
  FileSearch,
  CheckSquare,
  type LucideIcon,
} from "lucide-react";
import { cn } from "../internal/cn.js";
import { ToolCallKind } from "@peasant-labs/types";

/**
 * Map a tool name OR toolKind to a Lucide icon. All icons are stroke-1.5,
 * monochrome — they pick up `currentColor` from the parent.
 *
 * Resolution priority: explicit tool name match → toolKind fallback → Wrench.
 */
function iconFor(name: string, kind?: string): LucideIcon {
  const n = name.toLowerCase();

  if (n === "read" || n === "notebookread") return BookOpen;
  if (n === "edit" || n === "multiedit" || n === "notebookedit") return Pencil;
  if (n === "write") return FilePlus2;
  if (n === "bash" || n === "runcommand" || n === "run_command" || n === "shell")
    return Terminal;
  if (n === "grep" || n === "glob" || n === "globsearch")
    return n === "glob" ? FileSearch : Search;
  if (n === "websearch" || n === "web_search") return Search;
  if (n === "webfetch" || n === "web_fetch" || n === "fetch" || n === "readwebsite")
    return Globe;
  if (n === "agent" || n === "subagent" || n === "task") return GitBranch;
  if (
    n === "taskcreate" ||
    n === "taskupdate" ||
    n === "todowrite" ||
    n === "task_create" ||
    n === "task_update"
  )
    return ListChecks;
  if (n === "think" || n === "thinking") return Brain;
  if (n === "delete" || n === "remove") return Trash2;
  if (n === "move" || n === "rename") return ArrowRight;
  if (n === "checklist") return CheckSquare;

  switch (kind) {
    case ToolCallKind.Read:
      return BookOpen;
    case ToolCallKind.Edit:
      return Pencil;
    case ToolCallKind.Delete:
      return Trash2;
    case ToolCallKind.Move:
      return ArrowRight;
    case ToolCallKind.Search:
      return Search;
    case ToolCallKind.Execute:
      return Terminal;
    case ToolCallKind.Think:
      return Brain;
    case ToolCallKind.Fetch:
      return Globe;
    default:
      return Wrench;
  }
}

export interface ToolIconProps {
  name: string;
  kind?: string;
  size?: number;
  className?: string;
}

export function ToolIcon({ name, kind, size = 14, className }: ToolIconProps) {
  const Icon = iconFor(name, kind);
  return (
    <Icon size={size} strokeWidth={1.5} className={cn("tb-toolicon", className)} aria-hidden />
  );
}

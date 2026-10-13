import {
  CheckSquare, Database, BarChart3, FileText, ListChecks, Sparkles,
} from "lucide-react";

export const TOOL_ICONS = {
  check_inputs: CheckSquare,
  read_records: Database,
  summarize: BarChart3,
  organize_report: FileText,
  evaluate: ListChecks,
  cite_sources: Sparkles,
  confirm_assumptions: CheckSquare,
};

export const STATUS_STYLES = {
  ok: "bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-200 dark:border-emerald-800",
  pass: "bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-200 dark:border-emerald-800",
  warning: "bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950 dark:text-amber-200 dark:border-amber-800",
  needs_review: "bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950 dark:text-amber-200 dark:border-amber-800",
  skipped: "bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
  not_assessed: "bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
};

export const STATUS_LABELS = {
  pass: "Passed",
  needs_review: "Needs review",
  not_assessed: "Not assessed",
  ok: "Done",
  warning: "Attention",
  skipped: "Skipped",
};

export const AGENT_STATUS = {
  draft: { label: "Draft", cls: "bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700" },
  test: { label: "Tested", cls: "bg-sky-100 text-sky-900 border-sky-300 dark:bg-sky-950 dark:text-sky-200 dark:border-sky-800" },
  published: { label: "Published", cls: "bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-200 dark:border-emerald-800" },
};

export function timeAgo(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return d.toLocaleDateString();
}

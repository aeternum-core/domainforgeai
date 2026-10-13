import { cn } from "@/lib/utils";
import { AGENT_STATUS, STATUS_STYLES, STATUS_LABELS } from "@/lib/ui";
import { CheckCircle2, AlertTriangle, MinusCircle } from "lucide-react";

export function AgentStatusBadge({ status, className }) {
  const s = AGENT_STATUS[status] || AGENT_STATUS.draft;
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold", s.cls, className)}>
      {s.label}
    </span>
  );
}

const ICON = { pass: CheckCircle2, ok: CheckCircle2, warning: AlertTriangle, needs_review: AlertTriangle, skipped: MinusCircle, not_assessed: MinusCircle };

export function StepStatusBadge({ status, className }) {
  const Icon = ICON[status] || MinusCircle;
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold", STATUS_STYLES[status] || STATUS_STYLES.skipped, className)}>
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {STATUS_LABELS[status] || status}
    </span>
  );
}

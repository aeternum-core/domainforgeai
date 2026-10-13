import { StepStatusBadge } from "@/components/StatusBadge";

export function ChecklistResult({ checklist = [] }) {
  if (!checklist.length) return null;
  return (
    <ul className="space-y-2" aria-label="Quality checklist results">
      {checklist.map((c, i) => (
        <li key={i} className="flex items-start justify-between gap-3 rounded-lg border border-border bg-card p-3">
          <div className="min-w-0">
            <p className="text-sm font-medium">{c.label}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{c.explanation}</p>
          </div>
          <StepStatusBadge status={c.status} className="shrink-0" />
        </li>
      ))}
    </ul>
  );
}

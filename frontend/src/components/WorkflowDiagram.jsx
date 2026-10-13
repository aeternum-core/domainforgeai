import { TOOL_ICONS } from "@/lib/ui";
import { ArrowDown } from "lucide-react";
import { StepStatusBadge } from "@/components/StatusBadge";

export function WorkflowDiagram({ workflow = [], runSteps = null }) {
  const statusById = {};
  if (runSteps) runSteps.forEach((s) => { statusById[s.id] = s.status; });
  return (
    <ol className="space-y-0" aria-label="Agent workflow steps">
      {workflow.map((step, i) => {
        const Icon = TOOL_ICONS[step.tool] || TOOL_ICONS.organize_report;
        const status = runSteps ? statusById[step.id] : null;
        return (
          <li key={step.id || i} className="animate-fade-up" style={{ animationDelay: `${i * 60}ms` }}>
            <div className="flex items-start gap-4 rounded-xl border border-border bg-card p-4 shadow-sm">
              <div className="flex flex-col items-center">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/10 text-primary font-heading font-bold">
                  {i + 1}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Icon className="h-4 w-4 text-primary" aria-hidden="true" />
                  <h4 className="font-heading text-base font-semibold">{step.title}</h4>
                  {status && <StepStatusBadge status={status} />}
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{step.description}</p>
                {step.uses?.length > 0 && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    <span className="font-semibold">Uses:</span> {step.uses.join(", ")}
                  </p>
                )}
              </div>
            </div>
            {i < workflow.length - 1 && (
              <div className="flex justify-center py-1.5" aria-hidden="true">
                <ArrowDown className="h-4 w-4 text-muted-foreground/60" />
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}

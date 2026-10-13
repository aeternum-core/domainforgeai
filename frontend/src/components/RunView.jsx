import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Play, Loader2, Terminal, FileText, Info } from "lucide-react";
import { TOOL_ICONS } from "@/lib/ui";
import { StepStatusBadge } from "@/components/StatusBadge";
import { ChecklistResult } from "@/components/ChecklistResult";

const WATER_SAMPLE = `site,date,rainfall_mm,standing_water_cm,drain_status
Market Road,2024-07-03,86,34,blocked
School Lane,2024-07-18,54,8,clear`;

export function RunView({ inputs = [], hasSample = false, sampleInfo = null, onRun, idPrefix = "run" }) {
  const [form, setForm] = useState({});
  const [useSample, setUseSample] = useState(hasSample);
  const [rawRecords, setRawRecords] = useState("");
  const [running, setRunning] = useState(false);
  const [run, setRun] = useState(null);
  const [visibleSteps, setVisibleSteps] = useState(0);

  const recordInput = inputs.find((i) => i.type === "records");
  const textInputs = inputs.filter((i) => i.type !== "records");

  const reveal = (steps) => {
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) { setVisibleSteps(steps.length); return; }
    setVisibleSteps(0);
    let n = 0;
    const timer = setInterval(() => {
      n += 1;
      setVisibleSteps(n);
      if (n >= steps.length) clearInterval(timer);
    }, 420);
  };

  const submit = async () => {
    const missing = inputs.filter((i) => i.required && i.type !== "records" && !(form[i.key] || "").trim());
    if (!useSample && !rawRecords.trim() && recordInput?.required) {
      toast.error("Add data records or switch on the sample dataset.");
      return;
    }
    if (missing.length) {
      toast.error(`Please fill: ${missing.map((m) => m.label).join(", ")}`);
      return;
    }
    setRunning(true);
    setRun(null);
    try {
      const payload = { inputs: form, use_sample: useSample, raw_records: useSample ? null : rawRecords };
      const result = await onRun(payload);
      setRun(result);
      reveal(result.steps || []);
      toast.success("Run complete");
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Run failed. Please try again.");
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Input column */}
      <section aria-label="Run inputs" className="space-y-4 rounded-xl border border-border bg-card p-5 shadow-sm">
        <h3 className="font-heading text-lg font-semibold">What is the agent working with?</h3>
        {textInputs.map((inp) => (
          <div key={inp.key} className="space-y-1.5">
            <Label htmlFor={`${idPrefix}-${inp.key}`}>
              {inp.label}{inp.required && <span className="text-destructive"> *</span>}
            </Label>
            {inp.type === "textarea" ? (
              <Textarea
                id={`${idPrefix}-${inp.key}`}
                data-testid={`${idPrefix}-field-${inp.key}`}
                rows={3}
                placeholder={inp.help}
                value={form[inp.key] || ""}
                onChange={(e) => setForm({ ...form, [inp.key]: e.target.value })}
              />
            ) : (
              <Input
                id={`${idPrefix}-${inp.key}`}
                data-testid={`${idPrefix}-field-${inp.key}`}
                placeholder={inp.help}
                value={form[inp.key] || ""}
                onChange={(e) => setForm({ ...form, [inp.key]: e.target.value })}
              />
            )}
            {inp.help && <p className="text-xs text-muted-foreground">{inp.help}</p>}
          </div>
        ))}

        {recordInput && (
          <div className="space-y-2 rounded-lg border border-border bg-background p-3">
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor={`${idPrefix}-use-sample`} className="text-sm font-medium">
                Use sample dataset
              </Label>
              <Switch
                id={`${idPrefix}-use-sample`}
                data-testid={`${idPrefix}-use-sample`}
                checked={useSample}
                disabled={!hasSample}
                onCheckedChange={setUseSample}
              />
            </div>
            {hasSample ? (
              <p className="text-xs text-muted-foreground inline-flex items-center gap-1">
                <Info className="h-3 w-3" />
                {sampleInfo ? `${sampleInfo.name} — ${sampleInfo.count ?? ""} synthetic records (sample data).` : "Synthetic sample records for demonstration."}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">No sample dataset attached — paste records below.</p>
            )}
            {!useSample && (
              <div className="space-y-1.5">
                <Label htmlFor={`${idPrefix}-records`} className="text-sm">{recordInput.label}</Label>
                <Textarea
                  id={`${idPrefix}-records`}
                  data-testid={`${idPrefix}-field-records`}
                  rows={5}
                  className="font-mono text-xs"
                  placeholder={"Paste CSV or JSON rows, e.g.\n" + WATER_SAMPLE}
                  value={rawRecords}
                  onChange={(e) => setRawRecords(e.target.value)}
                />
                <button
                  type="button"
                  className="text-xs font-semibold text-primary underline-offset-2 hover:underline"
                  data-testid={`${idPrefix}-fill-example`}
                  onClick={() => setRawRecords(WATER_SAMPLE)}
                >
                  Insert example CSV
                </button>
              </div>
            )}
          </div>
        )}

        <Button className="w-full" onClick={submit} disabled={running} data-testid={`${idPrefix}-submit`}>
          {running ? <><Loader2 className="h-4 w-4 animate-spin" /> Running…</> : <><Play className="h-4 w-4" /> Run agent</>}
        </Button>
        <p className="text-xs text-muted-foreground">
          Runs locally in Demo mode with deterministic built-in tools — not a live AI model.
        </p>
      </section>

      {/* Output column */}
      <section aria-label="Run activity and results" aria-live="polite" className="space-y-4">
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h3 className="mb-3 inline-flex items-center gap-2 font-heading text-lg font-semibold">
            <Terminal className="h-4 w-4 text-primary" /> Tool activity
          </h3>
          {!run && !running && (
            <p className="text-sm text-muted-foreground">Run the agent to see each workflow step and tool execute here.</p>
          )}
          {running && (
            <p className="inline-flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Executing workflow…
            </p>
          )}
          {run && (
            <ol className="space-y-2" data-testid={`${idPrefix}-steps`}>
              {run.steps.map((s, i) => {
                const Icon = TOOL_ICONS[s.tool] || FileText;
                const shown = i < visibleSteps;
                return (
                  <li
                    key={s.id || i}
                    className={`rounded-lg border border-border bg-background p-3 transition-opacity ${shown ? "opacity-100" : "opacity-30"}`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-2 text-sm font-semibold">
                        <Icon className="h-4 w-4 text-primary" /> {i + 1}. {s.title}
                      </span>
                      {shown && <StepStatusBadge status={s.status} />}
                    </div>
                    {shown && <p className="mt-1 text-sm text-muted-foreground">{s.summary}</p>}
                    {shown && s.logs?.length > 0 && (
                      <pre className="mt-2 max-h-32 overflow-auto rounded bg-muted p-2 font-mono text-[11px] leading-relaxed text-foreground/80">
{s.logs.join("\n")}
                      </pre>
                    )}
                  </li>
                );
              })}
            </ol>
          )}
        </div>

        {run && <RunResult result={run.result} idPrefix={idPrefix} />}
      </section>
    </div>
  );
}

export function RunResult({ result, idPrefix = "run" }) {
  if (!result) return null;
  return (
    <div className="space-y-4" data-testid={`${idPrefix}-result`}>
      <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <h3 className="inline-flex items-center gap-2 font-heading text-lg font-semibold">
          <FileText className="h-4 w-4 text-primary" /> {result.report?.title || "Report"}
        </h3>
        <div className="mt-3 space-y-4">
          {result.report?.sections?.map((sec, i) => (
            <div key={i}>
              <h4 className="font-heading text-sm font-bold uppercase tracking-wide text-primary">{sec.heading}</h4>
              <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-foreground/90">{sec.body}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <h4 className="mb-2 font-heading text-sm font-bold">Inputs that informed this result</h4>
          <ul className="space-y-1 text-sm text-muted-foreground">
            {result.used_inputs?.map((u, i) => (
              <li key={i}><span className="font-medium text-foreground">{u.label}:</span> {u.value}</li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <h4 className="mb-2 font-heading text-sm font-bold">Assumptions</h4>
          <ul className="list-disc space-y-1 pl-4 text-sm text-muted-foreground">
            {result.assumptions?.map((a, i) => <li key={i}>{a}</li>)}
          </ul>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <h4 className="mb-2 font-heading text-sm font-bold">Quality checklist</h4>
        <ChecklistResult checklist={result.checklist} />
      </div>

      <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/40">
        <h4 className="mb-2 font-heading text-sm font-bold text-amber-900 dark:text-amber-200">Limitations — please read</h4>
        <ul className="list-disc space-y-1 pl-4 text-sm text-amber-900/90 dark:text-amber-200/90">
          {result.limitations?.map((l, i) => <li key={i}>{l}</li>)}
        </ul>
      </div>
    </div>
  );
}

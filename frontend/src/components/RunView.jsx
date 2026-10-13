import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Play,
  Loader2,
  Terminal,
  FileText,
  Info,
  Upload,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  X,
  Sparkles,
} from "lucide-react";
import { TOOL_ICONS } from "@/lib/ui";
import { StepStatusBadge } from "@/components/StatusBadge";
import { MarkdownView } from "@/components/MarkdownView";

const WATER_SAMPLE = `site,date,rainfall_mm,standing_water_cm,drain_status
Market Road,2024-07-03,86,34,blocked
Market Road,2024-07-04,42,20,blocked
School Lane,2024-07-18,54,8,clear
Cross Road 4th,2024-07-22,78,28,blocked
Hospital Gate,2024-07-25,92,45,blocked
Park Avenue,2024-07-29,35,5,clear`;

export function RunView({
  inputs = [],
  hasSample = false,
  sampleInfo = null,
  onRun,
  idPrefix = "run",
}) {
  const [form, setForm] = useState({});
  const [useSample, setUseSample] = useState(hasSample);
  const [rawRecords, setRawRecords] = useState("");
  const [fileMeta, setFileMeta] = useState(null);
  const [running, setRunning] = useState(false);
  const [progressVal, setProgressVal] = useState(0);
  const [activeStepText, setActiveStepText] = useState("");
  const [streamEvents, setStreamEvents] = useState([]);
  const [run, setRun] = useState(null);
  const fileInputRef = useRef(null);

  const recordInput = inputs.find((i) => i.type === "records");
  const textInputs = inputs.filter((i) => i.type !== "records");

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target.result;
      setRawRecords(text);
      const lines = text.trim().split("\n");
      const headers = lines[0]?.split(",").map((h) => h.trim()) || [];
      setFileMeta({
        name: file.name,
        rows: Math.max(0, lines.length - 1),
        headers: headers.slice(0, 5),
      });
      setUseSample(false);
      toast.success(`Loaded ${file.name} (${lines.length - 1} rows)`);
    };
    reader.readAsText(file);
  };

  const clearFile = () => {
    setFileMeta(null);
    setRawRecords("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const submit = async () => {
    const missing = inputs.filter(
      (i) => i.required && i.type !== "records" && !(form[i.key] || "").trim()
    );
    if (!useSample && !rawRecords.trim() && recordInput?.required) {
      toast.error("Add data records or switch on the sample dataset.");
      return;
    }
    if (missing.length) {
      toast.error(`Please fill: ${missing.map((m) => m.label).join(", ")}`);
      return;
    }

    setRunning(true);
    setProgressVal(15);
    setActiveStepText("Connecting to live engine...");
    setStreamEvents([]);
    setRun(null);

    const payload = {
      inputs: form,
      use_sample: useSample,
      raw_records: useSample ? null : rawRecords,
    };

    try {
      // Execute live workflow with streaming callback support
      const result = await onRun(payload, {
        onProgress: (trace) => {
          setActiveStepText(trace.step_name);
          setStreamEvents((prev) => [...prev, trace]);
          setProgressVal((p) => Math.min(90, p + 18));
        },
        onCompleted: (compData) => {
          setProgressVal(100);
          setActiveStepText("Completed");
          if (compData.result) {
            setRun({
              ...compData,
              steps: (compData.events || []).map((e, idx) => ({
                id: idx,
                tool: e.tool_call || "process",
                title: e.step_name,
                status: e.status === "running" ? "ok" : e.status,
                summary: e.message,
                logs: [e.message, e.tool_output ? JSON.stringify(e.tool_output, null, 2) : ""].filter(Boolean),
              })),
            });
          }
        },
      });

      if (result) {
        setProgressVal(100);
        setRun(result);
        if (result.events) {
          setStreamEvents(result.events);
        }
      }
      toast.success("Live analysis complete");
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Run failed. Please check inputs.");
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Input column */}
      <section
        aria-label="Run inputs"
        className="space-y-4 rounded-xl border border-border bg-card p-5 shadow-sm"
      >
        <div className="flex items-center justify-between">
          <h3 className="font-heading text-lg font-semibold">What is the agent working with?</h3>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live Engine
          </span>
        </div>

        {textInputs.map((inp) => (
          <div key={inp.key} className="space-y-1.5">
            <Label htmlFor={`${idPrefix}-${inp.key}`}>
              {inp.label}
              {inp.required && <span className="text-destructive"> *</span>}
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
          <div className="space-y-3 rounded-lg border border-border bg-background p-3">
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
              <p className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <Info className="h-3 w-3" />
                {sampleInfo
                  ? `${sampleInfo.name} — ${sampleInfo.count ?? ""} records ready for analysis.`
                  : "Verified municipal records attached for testing."}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">No sample dataset attached — provide records below.</p>
            )}

            {!useSample && (
              <div className="space-y-2 pt-1 border-t border-border">
                <div className="flex items-center justify-between">
                  <Label htmlFor={`${idPrefix}-records`} className="text-sm">
                    {recordInput.label}
                  </Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="mr-1 h-3 w-3" /> Upload CSV/JSON
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.json,.txt"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                </div>

                {fileMeta && (
                  <div className="flex items-center justify-between rounded-md border border-emerald-300 bg-emerald-50 px-2.5 py-1.5 text-xs text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200">
                    <span className="flex items-center gap-1.5">
                      <FileSpreadsheet className="h-3.5 w-3.5" />
                      <strong>{fileMeta.name}</strong> ({fileMeta.rows} rows, headers: {fileMeta.headers.join(", ")})
                    </span>
                    <button onClick={clearFile} className="hover:opacity-75">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}

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
                  onClick={() => {
                    setRawRecords(WATER_SAMPLE);
                    setFileMeta({ name: "Urban_Waterlogging_Field_Logs.csv", rows: 6, headers: ["site", "date", "rainfall_mm", "standing_water_cm", "drain_status"] });
                  }}
                >
                  Insert example field logs CSV
                </button>
              </div>
            )}
          </div>
        )}

        <Button
          className="w-full"
          onClick={submit}
          disabled={running}
          data-testid={`${idPrefix}-submit`}
        >
          {running ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Executing Live Agent…
            </>
          ) : (
            <>
              <Play className="mr-2 h-4 w-4" /> Run Live Workflow
            </>
          )}
        </Button>
        <p className="text-xs text-muted-foreground text-center">
          Streams real-time analysis tools and synthesizes structured output.
        </p>
      </section>

      {/* Output / Streaming column */}
      <section aria-label="Run activity and results" aria-live="polite" className="space-y-4">
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="inline-flex items-center gap-2 font-heading text-lg font-semibold">
              <Terminal className="h-4 w-4 text-primary" /> Live Engine Activity
            </h3>
            {running && (
              <Badge variant="outline" className="border-primary/50 text-primary">
                Streaming SSE
              </Badge>
            )}
          </div>

          {/* Progress bar during live run */}
          {running && (
            <div className="mb-4 space-y-1.5">
              <div className="flex justify-between text-xs font-medium text-muted-foreground">
                <span className="flex items-center gap-1.5 text-primary">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> {activeStepText}
                </span>
                <span>{progressVal}%</span>
              </div>
              <Progress value={progressVal} className="h-2" />
            </div>
          )}

          {!run && !running && (
            <p className="text-sm text-muted-foreground">
              Run the agent to stream live workflow execution steps, statistical aggregation, spatial hotspot clustering, and LLM synthesis.
            </p>
          )}

          {/* Live events / Step trace */}
          {(streamEvents.length > 0 || run?.steps?.length > 0) && (
            <ol className="space-y-2" data-testid={`${idPrefix}-steps`}>
              {(run?.steps || streamEvents).map((s, i) => {
                const Icon = TOOL_ICONS[s.tool || s.tool_call] || FileText;
                const title = s.title || s.step_name;
                const status = s.status;
                const summary = s.summary || s.message;
                const logs = s.logs || (s.tool_output ? [JSON.stringify(s.tool_output, null, 2)] : []);

                return (
                  <li
                    key={s.id || i}
                    className="rounded-lg border border-border bg-background p-3 transition-all"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-2 text-sm font-semibold">
                        <Icon className="h-4 w-4 text-primary" /> {i + 1}. {title}
                      </span>
                      <StepStatusBadge status={status === "running" ? "ok" : status} />
                    </div>
                    {summary && <p className="mt-1 text-sm text-muted-foreground">{summary}</p>}
                    {logs && logs.length > 0 && (
                      <pre className="mt-2 max-h-36 overflow-auto rounded bg-muted p-2 font-mono text-[11px] leading-relaxed text-foreground/85">
                        {Array.isArray(logs) ? logs.join("\n") : logs}
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
  const [showRawMarkdown, setShowRawMarkdown] = useState(false);
  if (!result) return null;

  return (
    <div className="space-y-4" data-testid={`${idPrefix}-result`}>
      {/* 1. Executive Summary & Synthesis */}
      <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <h3 className="inline-flex items-center gap-2 font-heading text-lg font-semibold">
            <Sparkles className="h-4 w-4 text-primary" /> Analysis Synthesis
          </h3>
          {result.raw_markdown && (
            <Button
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={() => setShowRawMarkdown(!showRawMarkdown)}
            >
              {showRawMarkdown ? "View Cards" : "View Raw Markdown"}
            </Button>
          )}
        </div>

        {showRawMarkdown && result.raw_markdown ? (
          <div className="mt-4 rounded-lg bg-muted/40 p-4">
            <MarkdownView content={result.raw_markdown} />
          </div>
        ) : (
          <div className="mt-3 space-y-4">
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-3.5">
              <h4 className="font-heading text-xs font-bold uppercase tracking-wider text-primary">
                Executive Summary
              </h4>
              <p className="mt-1 text-sm leading-relaxed text-foreground/90 font-medium">
                {result.summary || result.report?.sections?.[0]?.body || "Automated synthesis report generated."}
              </p>
            </div>

            {/* Key Patterns */}
            {result.key_patterns && result.key_patterns.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-heading text-xs font-bold uppercase tracking-wider text-primary">
                  Key Patterns & Spatial Findings
                </h4>
                <ul className="space-y-1.5">
                  {result.key_patterns.map((pat, idx) => (
                    <li
                      key={idx}
                      className="flex items-start gap-2 rounded-md bg-muted/50 p-2.5 text-xs text-foreground/90"
                    >
                      <span className="font-bold text-primary">•</span>
                      <span>{pat}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 2. Actionable Evidence Gaps & Questions */}
      {result.data_gaps_and_questions && result.data_gaps_and_questions.length > 0 && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 shadow-sm dark:border-amber-800 dark:bg-amber-950/40">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-700 dark:text-amber-400" />
            <h4 className="font-heading text-sm font-bold text-amber-900 dark:text-amber-200">
              Evidence Gaps & Questions for Field Engineers
            </h4>
          </div>
          <p className="mt-1 text-xs text-amber-800/80 dark:text-amber-300/80">
            Unverified hydraulic variables identified by the verification engine:
          </p>
          <ul className="mt-2.5 space-y-1.5 pl-2 text-xs text-amber-900 dark:text-amber-200">
            {result.data_gaps_and_questions.map((gap, i) => (
              <li key={i} className="flex items-start gap-2">
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
                <span>{gap}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 3. Quality Checklist using shadcn Badges */}
      {result.quality_checklist && result.quality_checklist.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <h4 className="mb-3 font-heading text-sm font-bold">Quality Verification Checklist</h4>
          <ul className="space-y-2">
            {result.quality_checklist.map((item, i) => {
              const isPass = item.status === "pass";
              return (
                <li
                  key={i}
                  className="flex items-start justify-between gap-3 rounded-lg border border-border bg-background p-2.5"
                >
                  <div className="space-y-0.5">
                    <p className="text-xs font-semibold text-foreground">{item.item}</p>
                    {item.comment && (
                      <p className="text-[11px] text-muted-foreground">{item.comment}</p>
                    )}
                  </div>
                  <Badge
                    variant={isPass ? "outline" : "secondary"}
                    className={
                      isPass
                        ? "border-emerald-400 bg-emerald-100 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                        : "border-amber-400 bg-amber-100 text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300"
                    }
                  >
                    {isPass ? "pass" : "needs_review"}
                  </Badge>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* 4. Input context & limitations */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <h4 className="mb-2 font-heading text-sm font-bold">Informed Inputs</h4>
          <ul className="space-y-1 text-xs text-muted-foreground">
            {result.used_inputs?.map((u, i) => (
              <li key={i}>
                <span className="font-semibold text-foreground">{u.label}:</span> {u.value}
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <h4 className="mb-2 font-heading text-sm font-bold">Assumptions & Caveats</h4>
          <ul className="list-disc space-y-1 pl-4 text-xs text-muted-foreground">
            {(result.assumptions || []).map((a, i) => (
              <li key={i}>{a}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

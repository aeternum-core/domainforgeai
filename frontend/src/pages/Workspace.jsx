import { useCallback, useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { toast } from "sonner";
import {
  Loader2, Save, Rocket, Trash2, Copy, ExternalLink, RotateCcw, History,
  MessageSquarePlus, CheckCircle2, XCircle, ArrowLeft, Database, PencilLine, ShieldAlert,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { api, siteOrigin } from "@/lib/api";
import { AgentStatusBadge } from "@/components/StatusBadge";
import { WorkflowDiagram } from "@/components/WorkflowDiagram";
import { RunView, RunResult } from "@/components/RunView";
import { ChecklistResult } from "@/components/ChecklistResult";
import { TOOL_ICONS, timeAgo } from "@/lib/ui";

const TABS = [
  ["overview", "Overview"], ["workflow", "Workflow"], ["data", "Data & tools"],
  ["run", "Run"], ["results", "Results"], ["activity", "Activity"],
  ["improve", "Improve"], ["deploy", "Deploy"],
];

export default function Workspace() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [agent, setAgent] = useState(null);
  const [runs, setRuns] = useState([]);
  const [tab, setTab] = useState("overview");
  const [latestRun, setLatestRun] = useState(null);

  const refresh = useCallback(async () => {
    const [a, r] = await Promise.all([api.getAgent(id), api.getRuns(id)]);
    setAgent(a);
    setRuns(r);
    if (!latestRun && r.length) setLatestRun(r[0]);
  }, [id]); // eslint-disable-line

  useEffect(() => { refresh().catch(() => toast.error("Agent not found")); }, [refresh]);

  if (!agent) {
    return <div className="mx-auto max-w-5xl px-4 py-20 text-center text-muted-foreground"><Loader2 className="mx-auto h-6 w-6 animate-spin" /></div>;
  }

  const onOwnerRun = async (payload) => {
    const run = await api.runOwner(id, payload);
    setLatestRun(run);
    refresh();
    return run;
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <Button variant="ghost" size="sm" className="mb-4" onClick={() => navigate("/")}><ArrowLeft className="h-4 w-4" /> Dashboard</Button>

      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <AgentStatusBadge status={agent.status} />
            <span className="rounded-full border border-border bg-muted px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">v{agent.version}</span>
            {agent.is_sample && <span className="rounded-full border border-indigo-300 bg-indigo-100 px-2.5 py-0.5 text-xs font-bold text-indigo-900 dark:border-indigo-800 dark:bg-indigo-950 dark:text-indigo-200">Sample data</span>}
            {agent.published && <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300 bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"><Rocket className="h-3 w-3" /> Live</span>}
          </div>
          <h1 className="mt-2 font-heading text-3xl font-extrabold tracking-tight">{agent.name}</h1>
          <p className="mt-1 max-w-2xl text-muted-foreground">{agent.purpose}</p>
        </div>
      </header>

      <Tabs value={tab} onValueChange={setTab}>
        <div className="overflow-x-auto">
          <TabsList className="mb-6 inline-flex h-auto flex-nowrap gap-1 bg-muted/70 p-1">
            {TABS.map(([v, label]) => (
              <TabsTrigger key={v} value={v} data-testid={`tab-${v}`} className="whitespace-nowrap data-[state=active]:bg-background">{label}</TabsTrigger>
            ))}
          </TabsList>
        </div>

        <TabsContent value="overview"><OverviewTab agent={agent} onSaved={refresh} /></TabsContent>
        <TabsContent value="workflow"><WorkflowTab agent={agent} onSaved={refresh} /></TabsContent>
        <TabsContent value="data"><DataToolsTab agent={agent} /></TabsContent>
        <TabsContent value="run">
          <RunView inputs={agent.inputs} hasSample={!!agent.sample_data}
            sampleInfo={agent.sample_data ? { name: agent.sample_data.name, count: agent.sample_data.records?.length } : null}
            onRun={onOwnerRun} idPrefix="run" />
        </TabsContent>
        <TabsContent value="results"><ResultsTab latestRun={latestRun} onGoRun={() => setTab("run")} /></TabsContent>
        <TabsContent value="activity"><ActivityTab runs={runs} feedback={agent.feedback} /></TabsContent>
        <TabsContent value="improve"><ImproveTab agent={agent} onSaved={refresh} /></TabsContent>
        <TabsContent value="deploy"><DeployTab agent={agent} onChanged={refresh} onGoRun={() => setTab("run")} /></TabsContent>
      </Tabs>
    </div>
  );
}

/* ---------------- Overview ---------------- */
function OverviewTab({ agent, onSaved }) {
  const [edit, setEdit] = useState(false);
  const [name, setName] = useState(agent.name);
  const [purpose, setPurpose] = useState(agent.purpose);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try { await api.updateAgent(agent.id, { name, purpose }); toast.success("Saved"); setEdit(false); onSaved(); }
    catch { toast.error("Could not save."); } finally { setSaving(false); }
  };

  return (
    <div className="grid gap-5 lg:grid-cols-3">
      <div className="space-y-5 lg:col-span-2">
        <Card title="About this agent" action={
          <Button variant="outline" size="sm" onClick={() => setEdit(!edit)} data-testid="overview-edit"><PencilLine className="h-4 w-4" /> {edit ? "Cancel" : "Edit"}</Button>
        }>
          {edit ? (
            <div className="space-y-3">
              <div className="space-y-1.5"><Label htmlFor="o-name">Name</Label><Input id="o-name" value={name} onChange={(e) => setName(e.target.value)} data-testid="overview-name" /></div>
              <div className="space-y-1.5"><Label htmlFor="o-purpose">Purpose</Label><Textarea id="o-purpose" rows={3} value={purpose} onChange={(e) => setPurpose(e.target.value)} data-testid="overview-purpose" /></div>
              <Button onClick={save} disabled={saving} data-testid="overview-save">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save</Button>
            </div>
          ) : (
            <dl className="grid gap-3 sm:grid-cols-2">
              <Info label="Domain" value={agent.domain} />
              <Info label="Status" value={agent.status} />
              <Info label="Intended beneficiaries" value={agent.beneficiaries} full />
              <Info label="Problem it helps with" value={agent.problem} full />
            </dl>
          )}
        </Card>

        <Card title="Expected outputs">
          <ul className="list-disc space-y-1 pl-4 text-sm text-muted-foreground">
            {agent.outputs?.map((o, i) => <li key={i}>{o}</li>)}
          </ul>
        </Card>
      </div>

      <div className="space-y-5">
        <Card title="Limitations">
          <ul className="list-disc space-y-1.5 pl-4 text-sm text-muted-foreground">
            {agent.limitations?.map((l, i) => <li key={i}>{l}</li>)}
          </ul>
        </Card>
        <Card title="Assumptions">
          <ul className="list-disc space-y-1.5 pl-4 text-sm text-muted-foreground">
            {agent.assumptions?.map((a, i) => <li key={i}>{a}</li>)}
          </ul>
        </Card>
      </div>
    </div>
  );
}

/* ---------------- Workflow ---------------- */
function WorkflowTab({ agent, onSaved }) {
  const [edit, setEdit] = useState(false);
  const [wf, setWf] = useState(agent.workflow);
  const [saving, setSaving] = useState(false);
  useEffect(() => setWf(agent.workflow), [agent.workflow]);

  const upd = (i, k, v) => setWf((w) => w.map((s, idx) => idx === i ? { ...s, [k]: v } : s));
  const remove = (i) => setWf((w) => w.filter((_, idx) => idx !== i));
  const save = async () => {
    setSaving(true);
    try { await api.updateAgent(agent.id, { workflow: wf }); toast.success("Workflow saved"); setEdit(false); onSaved(); }
    catch { toast.error("Could not save."); } finally { setSaving(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">The ordered steps the agent runs. Each step uses a built-in tool.</p>
        <Button variant="outline" size="sm" onClick={() => setEdit(!edit)} data-testid="workflow-edit"><PencilLine className="h-4 w-4" /> {edit ? "Cancel" : "Edit steps"}</Button>
      </div>
      {edit ? (
        <div className="space-y-3">
          {wf.map((s, i) => {
            const Icon = TOOL_ICONS[s.tool] || PencilLine;
            return (
              <div key={s.id || i} className="rounded-lg border border-border bg-card p-3">
                <div className="flex items-start gap-3">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-bold text-primary">{i + 1}</span>
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex items-center gap-2"><Icon className="h-4 w-4 text-primary" /><Input className="h-8" value={s.title} onChange={(e) => upd(i, "title", e.target.value)} /></div>
                    <Textarea rows={2} value={s.description} onChange={(e) => upd(i, "description", e.target.value)} />
                  </div>
                  <Button variant="ghost" size="icon" aria-label={`Remove step ${i + 1}`} onClick={() => remove(i)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
            );
          })}
          <Button onClick={save} disabled={saving} data-testid="workflow-save">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save workflow</Button>
        </div>
      ) : (
        <WorkflowDiagram workflow={agent.workflow} />
      )}
    </div>
  );
}

/* ---------------- Data & tools ---------------- */
function DataToolsTab({ agent }) {
  const records = agent.sample_data?.records || [];
  const fields = records.length ? Object.keys(records[0]) : [];
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Card title="Built-in tools">
        <ul className="space-y-2">
          {agent.tools?.map((t) => {
            const Icon = TOOL_ICONS[t.id] || Database;
            return (
              <li key={t.id} className="flex items-start gap-3 rounded-lg border border-border bg-background p-3">
                <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold">{t.name}</p>
                    <span className="rounded-full border border-emerald-300 bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">Ready (built-in)</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{t.description}</p>
                </div>
              </li>
            );
          })}
          <li className="flex items-start gap-3 rounded-lg border border-dashed border-border bg-background p-3 text-muted-foreground">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
            <div><p className="text-sm font-semibold">Live external integrations</p><p className="text-xs">Unavailable in this demo — no external API keys are configured. Built-in tools run fully offline.</p></div>
          </li>
        </ul>
      </Card>

      <Card title={agent.sample_data ? agent.sample_data.name : "Sample data"}>
        {agent.sample_data ? (
          <>
            <p className="mb-3 rounded-lg border border-indigo-300 bg-indigo-50 p-2 text-xs text-indigo-900 dark:border-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-200">
              {agent.sample_data.description}
            </p>
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted"><tr>{fields.map((f) => <th key={f} className="whitespace-nowrap px-3 py-2 font-semibold">{f}</th>)}</tr></thead>
                <tbody>
                  {records.slice(0, 6).map((r, i) => (
                    <tr key={i} className="border-t border-border">{fields.map((f) => <td key={f} className="whitespace-nowrap px-3 py-1.5 text-muted-foreground">{String(r[f])}</td>)}</tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">{records.length} synthetic records · sample data only, not real measurements.</p>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">No sample dataset attached. In the Run tab you can paste your own CSV/JSON records.</p>
        )}
      </Card>
    </div>
  );
}

/* ---------------- Results ---------------- */
function ResultsTab({ latestRun, onGoRun }) {
  if (!latestRun) {
    return (
      <div className="rounded-xl border border-dashed border-border p-10 text-center">
        <p className="text-sm text-muted-foreground">No runs yet. Head to the Run tab to try the agent.</p>
        <Button className="mt-4" onClick={onGoRun}>Go to Run</Button>
      </div>
    );
  }
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">Result from the most recent run · {timeAgo(latestRun.created_at)} · {latestRun.result.records_count} record(s) from the {latestRun.result.record_source}.</p>
      <RunResult result={latestRun.result} idPrefix="results" />
    </div>
  );
}

/* ---------------- Activity ---------------- */
function ActivityTab({ runs, feedback }) {
  if (!runs.length && !(feedback || []).length) {
    return <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">No activity yet.</div>;
  }
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Card title={`Run history (${runs.length})`}>
        <ul className="space-y-2">
          {runs.map((r) => {
            const warn = r.steps.filter((s) => s.status === "warning").length;
            return (
              <li key={r.id} className="rounded-lg border border-border bg-background p-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold capitalize">{r.source} run · v{r.version_run}</span>
                  <span className="text-xs text-muted-foreground">{timeAgo(r.created_at)}</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {r.result.records_count} record(s); {r.steps.length} tools executed{warn ? `; ${warn} needing attention` : "; all clear"}.
                </p>
              </li>
            );
          })}
        </ul>
      </Card>
      <Card title={`Feedback & revisions (${(feedback || []).length})`}>
        {(feedback || []).length === 0 ? (
          <p className="text-sm text-muted-foreground">No feedback submitted yet. Use the Improve tab.</p>
        ) : (
          <ul className="space-y-2">
            {feedback.map((f) => (
              <li key={f.id} className="rounded-lg border border-border bg-background p-3">
                <p className="text-sm">“{f.text}”</p>
                <p className="mt-1 text-xs text-muted-foreground">→ v{f.resulting_version}: {f.changes.join("; ")} · {timeAgo(f.created_at)}</p>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

/* ---------------- Improve ---------------- */
function ImproveTab({ agent, onSaved }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [versions, setVersions] = useState(agent.versions || []);
  const [lastChange, setLastChange] = useState(null);

  useEffect(() => { api.versions(agent.id).then((d) => setVersions(d.versions)).catch(() => {}); }, [agent.id, agent.version]);

  const submit = async () => {
    if (text.trim().length < 4) { toast.error("Please describe what should change."); return; }
    setBusy(true);
    try {
      const res = await api.feedback(agent.id, text);
      setLastChange(res);
      setText("");
      toast.success(`Saved as version ${res.version}`);
      onSaved();
    } catch { toast.error("Could not save feedback."); } finally { setBusy(false); }
  };

  const suggestions = ["Show which data supports each conclusion", "Ask me before making assumptions", "Use plainer language in the report", "Prioritise the most urgent cases first"];

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Card title="Suggest an improvement">
        <p className="mb-2 text-sm text-muted-foreground">Describe in plain language what the agent should do differently. We'll save it as a new version.</p>
        <div className="mb-2 flex flex-wrap gap-1.5">
          {suggestions.map((s) => (
            <button key={s} onClick={() => setText(s)} className="rounded-full border border-border bg-muted px-2.5 py-1 text-xs text-muted-foreground hover:border-primary/50">{s}</button>
          ))}
        </div>
        <Textarea rows={3} value={text} onChange={(e) => setText(e.target.value)} placeholder="e.g. Show which data supports each conclusion" data-testid="feedback-text" />
        <Button className="mt-3" onClick={submit} disabled={busy} data-testid="feedback-submit">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquarePlus className="h-4 w-4" />} Save as new version
        </Button>
        {lastChange && (
          <div className="mt-4 rounded-lg border border-emerald-300 bg-emerald-50 p-3 dark:border-emerald-800 dark:bg-emerald-950/40" data-testid="improve-change">
            <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-200">What changed in v{lastChange.version}</p>
            <ul className="mt-1 list-disc pl-4 text-sm text-emerald-900/90 dark:text-emerald-200/90">
              {lastChange.changes.map((c, i) => <li key={i}>{c}</li>)}
            </ul>
            <p className="mt-2 text-xs text-emerald-900/80 dark:text-emerald-200/80">
              Steps: {lastChange.before.workflow.length} → {lastChange.after.workflow.length}. The published live version stays unchanged until you re-test and re-publish.
            </p>
          </div>
        )}
      </Card>

      <Card title={<span className="inline-flex items-center gap-2"><History className="h-4 w-4" /> Version history</span>}>
        <ol className="space-y-2">
          {[...versions].reverse().map((v) => (
            <li key={v.version} className="rounded-lg border border-border bg-background p-3">
              <div className="flex items-center justify-between text-sm">
                <span className="font-semibold">Version {v.version}{v.version === agent.version && " (current)"}</span>
                <span className="text-xs text-muted-foreground">{timeAgo(v.created_at)}</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{v.note}</p>
              {v.feedback && <p className="mt-1 text-xs italic text-muted-foreground">from: “{v.feedback}”</p>}
            </li>
          ))}
        </ol>
      </Card>
    </div>
  );
}

/* ---------------- Deploy ---------------- */
function DeployTab({ agent, onChanged, onGoRun }) {
  const [pre, setPre] = useState(null);
  const [busy, setBusy] = useState(false);
  const publicUrl = agent.slug ? `${siteOrigin()}/a/${agent.slug}` : null;

  const loadPre = useCallback(() => { api.prepublish(agent.id).then(setPre).catch(() => {}); }, [agent.id]);
  useEffect(() => { loadPre(); }, [loadPre, agent.version, agent.test_passed]);

  const publish = async () => {
    setBusy(true);
    try { await api.publish(agent.id); toast.success("Published! Your public page is live."); onChanged(); }
    catch (e) { toast.error(e?.response?.data?.detail || "Publish failed."); } finally { setBusy(false); }
  };
  const unpublish = async () => {
    setBusy(true);
    try { await api.unpublish(agent.id); toast.success("Unpublished. The public page is now disabled."); onChanged(); }
    catch { toast.error("Could not unpublish."); } finally { setBusy(false); }
  };
  const copy = () => { navigator.clipboard.writeText(publicUrl); toast.success("URL copied"); };

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Card title="Deployment status">
        <div className="flex items-center gap-3">
          <AgentStatusBadge status={agent.status} />
          <span className="text-sm text-muted-foreground">Draft → Test → Publish</span>
        </div>
        <ol className="mt-4 flex items-center gap-2 text-xs font-semibold">
          {["draft", "test", "published"].map((s, i) => (
            <li key={s} className="flex items-center gap-2">
              <span className={`rounded-full px-3 py-1 capitalize ${agent.status === s ? "bg-primary text-primary-foreground" : (["draft", "test", "published"].indexOf(agent.status) > i ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground")}`}>{s}</span>
              {i < 2 && <span className="text-muted-foreground">→</span>}
            </li>
          ))}
        </ol>

        <h4 className="mt-5 mb-2 text-sm font-bold">Pre-publish checklist</h4>
        <ul className="space-y-2">
          {pre?.items?.map((it) => (
            <li key={it.id} className="flex items-center gap-2 text-sm">
              {it.ok ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <XCircle className="h-4 w-4 text-amber-600" />}
              <span className={it.ok ? "" : "text-muted-foreground"}>{it.label}</span>
            </li>
          ))}
        </ul>
        {pre && !pre.ready && (
          <p className="mt-3 rounded-lg border border-amber-300 bg-amber-50 p-2 text-xs text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
            Complete every item to publish. Tip: run at least one successful test in the <button className="font-semibold underline" onClick={onGoRun}>Run tab</button>.
          </p>
        )}

        <div className="mt-5 flex flex-wrap gap-2">
          {!agent.published ? (
            <Button onClick={publish} disabled={busy || !pre?.ready} data-testid="publish-btn">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Rocket className="h-4 w-4" />} Publish agent page
            </Button>
          ) : (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" data-testid="unpublish-btn"><RotateCcw className="h-4 w-4" /> Unpublish</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Unpublish this agent?</AlertDialogTitle>
                  <AlertDialogDescription>The public page and its run endpoint will stop working immediately. You can publish again later.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={unpublish} data-testid="unpublish-confirm">Unpublish</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </Card>

      <Card title="Shareable public page">
        {agent.published && publicUrl ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Anyone with this link can run the published version — no editing controls.</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 overflow-x-auto rounded-lg border border-border bg-muted px-3 py-2 text-xs" data-testid="public-url">{publicUrl}</code>
              <Button variant="outline" size="icon" aria-label="Copy URL" onClick={copy} data-testid="copy-url"><Copy className="h-4 w-4" /></Button>
            </div>
            <Button asChild variant="outline" data-testid="open-public"><Link to={`/a/${agent.slug}`} target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4" /> Open public page</Link></Button>
            <p className="rounded-lg border border-border bg-muted/50 p-2 text-xs text-muted-foreground">
              Published on this running application and persisted on its server, so the link keeps working after a refresh.
              It is not pushed to the public internet — see the README to host it.
            </p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Publish the agent to generate a stable, shareable URL that runs the tested version.</p>
        )}
      </Card>
    </div>
  );
}

/* ---------------- shared ---------------- */
function Card({ title, action, children }) {
  return (
    <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="font-heading text-lg font-semibold">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}
function Info({ label, value, full }) {
  return (
    <div className={full ? "sm:col-span-2" : ""}>
      <dt className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm capitalize-first">{value || "—"}</dd>
    </div>
  );
}

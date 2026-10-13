import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import {
  ArrowLeft, ArrowRight, Sparkles, Loader2, Check, Wand2, Save, Info, Trash2, Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { TOOL_ICONS } from "@/lib/ui";

const STEPS = [
  { key: "problem", title: "The problem", help: "Describe your field and the problem you want to investigate." },
  { key: "data", title: "Your data", help: "Tell us what information or documents you already have." },
  { key: "goal", title: "The outcome", help: "What should the agent produce, and what are the limits?" },
  { key: "review", title: "Review & generate", help: "The Master Agent drafts an agent you can edit before saving." },
];

const FIELD_HELP = {
  domain: "e.g. Civil engineering, public health, education, agriculture…",
  problem: "What recurring issue do you want to understand better?",
  beneficiaries: "Who is affected, or who will use the result?",
  data_description: "e.g. rainfall records, survey responses, site photos, spreadsheets…",
  outcome: "e.g. an organised report highlighting patterns and open questions.",
  constraints: "Any rules, safety concerns, or things the agent must NOT claim.",
};

export default function CreateWizard() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    domain: "", problem: "", beneficiaries: "", data_description: "", outcome: "", constraints: "",
  });
  const [generating, setGenerating] = useState(false);
  const [proposal, setProposal] = useState(null);
  const [sampleData, setSampleData] = useState(null);
  const [templateId, setTemplateId] = useState(null);
  const [saving, setSaving] = useState(false);

  // Prefill from ?template=
  useEffect(() => {
    const tpl = params.get("template");
    if (!tpl) return;
    api.templates().then((list) => {
      const t = list.find((x) => x.template_id === tpl);
      if (t) {
        setForm({
          domain: t.domain, problem: t.problem, beneficiaries: t.beneficiaries,
          data_description: t.data_description, outcome: t.outcome, constraints: t.constraints,
        });
        setSampleData(t.sample_data);
        setTemplateId(t.template_id);
        toast.info("Prefilled from the guided demo — edit anything you like.");
      }
    });
  }, [params]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const insertSample = async (tpl) => {
    const list = await api.templates();
    const t = list.find((x) => x.template_id === tpl);
    if (!t) return;
    setForm({
      domain: t.domain, problem: t.problem, beneficiaries: t.beneficiaries,
      data_description: t.data_description, outcome: t.outcome, constraints: t.constraints,
    });
    setSampleData(t.sample_data);
    setTemplateId(t.template_id);
    toast.success("Example inserted");
  };

  const canNext = () => {
    if (step === 0) return form.problem.trim().length > 3;
    if (step === 1) return form.data_description.trim().length > 2;
    if (step === 2) return form.outcome.trim().length > 2;
    return true;
  };

  const generate = async () => {
    setGenerating(true);
    try {
      const res = await api.generate(form);
      setProposal(res.proposal);
      toast.success("Agent proposal generated (Demo mode)");
    } catch {
      toast.error("Could not generate the proposal.");
    } finally {
      setGenerating(false);
    }
  };

  const goReview = async () => {
    setStep(3);
    if (!proposal) await generate();
  };

  const save = async () => {
    setSaving(true);
    try {
      const agent = await api.createAgent({ proposal, template_id: templateId, sample_data: sampleData });
      toast.success("Agent saved");
      navigate(`/agents/${agent.id}`);
    } catch {
      toast.error("Could not save the agent.");
      setSaving(false);
    }
  };

  const updProposal = (k, v) => setProposal((p) => ({ ...p, [k]: v }));
  const updStep = (i, k, v) => setProposal((p) => {
    const wf = [...p.workflow];
    wf[i] = { ...wf[i], [k]: v };
    return { ...p, workflow: wf };
  });
  const removeStep = (i) => setProposal((p) => ({ ...p, workflow: p.workflow.filter((_, idx) => idx !== i) }));

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      {/* progress */}
      <nav aria-label="Progress" className="mb-8">
        <ol className="flex items-center gap-2">
          {STEPS.map((s, i) => {
            const done = i < step, current = i === step;
            return (
              <li key={s.key} className="flex flex-1 items-center gap-2">
                <div className="flex items-center gap-2" aria-current={current ? "step" : undefined}>
                  <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full border text-sm font-bold ${done ? "border-primary bg-primary text-primary-foreground" : current ? "border-primary text-primary" : "border-border text-muted-foreground"}`}>
                    {done ? <Check className="h-4 w-4" /> : i + 1}
                  </span>
                  <span className={`hidden text-sm font-semibold sm:block ${current ? "text-foreground" : "text-muted-foreground"}`}>{s.title}</span>
                </div>
                {i < STEPS.length - 1 && <span className={`h-0.5 flex-1 rounded ${done ? "bg-primary" : "bg-border"}`} />}
              </li>
            );
          })}
        </ol>
      </nav>

      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
        <h1 className="font-heading text-2xl font-bold sm:text-3xl">{STEPS[step].title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{STEPS[step].help}</p>

        {step === 0 && (
          <div className="mt-6 space-y-5 animate-fade-in">
            <div className="flex flex-wrap gap-2 rounded-lg border border-border bg-muted/50 p-3">
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground"><Info className="h-3.5 w-3.5" /> New here? Start from an example:</span>
              <button className="text-xs font-semibold text-primary hover:underline" onClick={() => insertSample("urban-waterlogging")} data-testid="insert-sample-water">Insert: Urban flooding</button>
              <span className="text-muted-foreground">·</span>
              <button className="text-xs font-semibold text-primary hover:underline" onClick={() => insertSample("accessibility-audit")} data-testid="insert-sample-access">Insert: Sidewalk audit</button>
            </div>
            <Field id="domain" label="Your field or domain" help={FIELD_HELP.domain} value={form.domain} onChange={(v) => set("domain", v)} />
            <Field id="problem" label="The problem you want to investigate *" help={FIELD_HELP.problem} textarea value={form.problem} onChange={(v) => set("problem", v)} />
            <Field id="beneficiaries" label="Who is affected or will use the result?" help={FIELD_HELP.beneficiaries} value={form.beneficiaries} onChange={(v) => set("beneficiaries", v)} />
          </div>
        )}

        {step === 1 && (
          <div className="mt-6 space-y-5 animate-fade-in">
            <Field id="data" label="What data or documents do you have? *" help={FIELD_HELP.data_description} textarea value={form.data_description} onChange={(v) => set("data_description", v)} />
            {sampleData && (
              <p className="rounded-lg border border-indigo-300 bg-indigo-50 p-3 text-sm text-indigo-900 dark:border-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-200">
                A synthetic sample dataset (“{sampleData.name}”, {sampleData.records?.length} records) will be attached so you can test immediately. It is clearly-labelled sample data.
              </p>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="mt-6 space-y-5 animate-fade-in">
            <Field id="outcome" label="What outcome do you want? *" help={FIELD_HELP.outcome} textarea value={form.outcome} onChange={(v) => set("outcome", v)} />
            <Field id="constraints" label="Important limits, rules or safety concerns" help={FIELD_HELP.constraints} textarea value={form.constraints} onChange={(v) => set("constraints", v)} />
          </div>
        )}

        {step === 3 && (
          <div className="mt-6 animate-fade-in">
            {generating && (
              <p className="inline-flex items-center gap-2 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /> The Master Agent is drafting your agent…</p>
            )}
            {!generating && !proposal && (
              <div className="rounded-xl border border-dashed border-border p-8 text-center">
                <Wand2 className="mx-auto h-8 w-8 text-primary" />
                <p className="mt-3 text-sm text-muted-foreground">Ready to turn your description into an agent.</p>
                <Button className="mt-4" onClick={generate} data-testid="generate-agent"><Sparkles className="h-4 w-4" /> Generate my agent</Button>
              </div>
            )}
            {!generating && proposal && (
              <ProposalEditor
                proposal={proposal}
                updProposal={updProposal}
                updStep={updStep}
                removeStep={removeStep}
                onRegenerate={generate}
              />
            )}
          </div>
        )}

        {/* nav buttons */}
        <div className="mt-8 flex items-center justify-between gap-3 border-t border-border pt-5">
          <Button variant="ghost" onClick={() => (step === 0 ? navigate("/") : setStep(step - 1))} data-testid="wizard-back">
            <ArrowLeft className="h-4 w-4" /> {step === 0 ? "Cancel" : "Back"}
          </Button>
          {step < 2 && (
            <Button onClick={() => canNext() ? setStep(step + 1) : toast.error("Please complete this step first.")} data-testid="wizard-next">
              Next <ArrowRight className="h-4 w-4" />
            </Button>
          )}
          {step === 2 && (
            <Button onClick={goReview} data-testid="wizard-review">Review &amp; generate <ArrowRight className="h-4 w-4" /></Button>
          )}
          {step === 3 && proposal && (
            <Button onClick={save} disabled={saving} data-testid="save-agent">
              {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</> : <><Save className="h-4 w-4" /> Save agent &amp; open workspace</>}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ id, label, help, value, onChange, textarea }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {textarea ? (
        <Textarea id={id} data-testid={`field-${id}`} rows={3} value={value} placeholder={help} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <Input id={id} data-testid={`field-${id}`} value={value} placeholder={help} onChange={(e) => onChange(e.target.value)} />
      )}
      <p className="text-xs text-muted-foreground">{help}</p>
    </div>
  );
}

function ProposalEditor({ proposal, updProposal, updStep, removeStep, onRegenerate }) {
  return (
    <div className="space-y-6" data-testid="proposal-editor">
      <div className="flex items-center justify-between gap-3 rounded-lg border border-emerald-300 bg-emerald-50 p-3 dark:border-emerald-800 dark:bg-emerald-950/40">
        <p className="text-sm text-emerald-900 dark:text-emerald-200">
          <Sparkles className="mr-1 inline h-4 w-4" /> Draft ready. Edit anything below, then save. Generated in Demo mode.
        </p>
        <Button variant="outline" size="sm" onClick={onRegenerate}><Wand2 className="h-4 w-4" /> Regenerate</Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="p-name">Agent name</Label>
          <Input id="p-name" data-testid="proposal-name" value={proposal.name} onChange={(e) => updProposal("name", e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="p-domain">Domain</Label>
          <Input id="p-domain" value={proposal.domain} onChange={(e) => updProposal("domain", e.target.value)} />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="p-purpose">Purpose</Label>
        <Textarea id="p-purpose" rows={2} value={proposal.purpose} onChange={(e) => updProposal("purpose", e.target.value)} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <InfoBlock label="Intended users & beneficiaries" value={proposal.beneficiaries} onChange={(v) => updProposal("beneficiaries", v)} />
        <InfoBlock label="Problem it helps with" value={proposal.problem} onChange={(v) => updProposal("problem", v)} />
      </div>

      <div>
        <h4 className="mb-2 font-heading text-sm font-bold uppercase tracking-wide text-primary">Plain-language workflow</h4>
        <div className="space-y-2">
          {proposal.workflow.map((s, i) => {
            const Icon = TOOL_ICONS[s.tool] || Plus;
            return (
              <div key={s.id || i} className="rounded-lg border border-border bg-background p-3">
                <div className="flex items-start gap-3">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-bold text-primary">{i + 1}</span>
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-primary" />
                      <Input className="h-8" value={s.title} onChange={(e) => updStep(i, "title", e.target.value)} aria-label={`Step ${i + 1} title`} />
                    </div>
                    <Textarea rows={2} value={s.description} onChange={(e) => updStep(i, "description", e.target.value)} aria-label={`Step ${i + 1} description`} />
                  </div>
                  <Button variant="ghost" size="icon" aria-label={`Remove step ${i + 1}`} onClick={() => removeStep(i)} className="text-muted-foreground"><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <ReadList title="Suggested tools" items={proposal.tools.map((t) => `${t.name} — ${t.description}`)} />
        <ReadList title="Checks the agent performs" items={proposal.checks.map((c) => c.label)} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="p-lim">Limitations &amp; when a human expert should review</Label>
        <Textarea id="p-lim" rows={4} value={(proposal.limitations || []).join("\n")} onChange={(e) => updProposal("limitations", e.target.value.split("\n").filter(Boolean))} />
        <p className="text-xs text-muted-foreground">One limitation per line.</p>
      </div>
    </div>
  );
}

function InfoBlock({ label, value, onChange }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Textarea rows={2} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function ReadList({ title, items }) {
  return (
    <div className="rounded-lg border border-border bg-background p-3">
      <h4 className="mb-2 text-sm font-bold">{title}</h4>
      <ul className="list-disc space-y-1 pl-4 text-sm text-muted-foreground">
        {items.map((it, i) => <li key={i}>{it}</li>)}
      </ul>
    </div>
  );
}

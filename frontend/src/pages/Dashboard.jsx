import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  Sparkles, Play, Plus, ArrowRight, Accessibility, HeartHandshake, Languages,
  Database, Trash2, ExternalLink, Rocket, FlaskConical, Loader2, ShieldCheck, Hexagon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { api } from "@/lib/api";
import { AgentStatusBadge } from "@/components/StatusBadge";
import { timeAgo } from "@/lib/ui";

export default function Dashboard() {
  const [templates, setTemplates] = useState([]);
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const navigate = useNavigate();

  const load = async () => {
    setLoading(true);
    try {
      const [t, a] = await Promise.all([api.templates(), api.listAgents()]);
      setTemplates(t);
      setAgents(a);
    } catch {
      toast.error("Could not reach the server.");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const openSample = async (templateId) => {
    setBusy(templateId);
    try {
      const agent = await api.instantiate(templateId);
      toast.success("Sample agent added to your workspace");
      navigate(`/agents/${agent.id}`);
    } catch {
      toast.error("Could not create the sample agent.");
      setBusy("");
    }
  };

  const guidedDemo = () => navigate("/create?template=urban-waterlogging");

  const resetDemo = async () => {
    try {
      await api.resetDemo();
      toast.success("Demo data cleared");
      load();
    } catch {
      toast.error("Could not reset demo data.");
    }
  };

  return (
    <div className="animate-fade-in">
      {/* HERO */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="dot-grid absolute inset-0 opacity-60" aria-hidden="true" />
        <div className="relative mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:py-20">
          <div className="animate-fade-up">
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.15em] text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
              <Sparkles className="h-3.5 w-3.5" /> Accessibility &amp; Social Good
            </span>
            <h1 className="mt-5 font-heading text-4xl font-extrabold leading-[1.1] tracking-tight sm:text-5xl lg:text-6xl">
              You understand the problem.<br />
              <span className="text-primary">We help build the agent.</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted-foreground">
              DomainForge lets non-technical domain experts turn a plain-language description of
              a real-world problem into a working, specialised AI agent — no code, no jargon.
              Describe it, generate it, test it, improve it, and publish a page anyone can use.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button size="lg" className="h-12 px-6 text-base" onClick={guidedDemo} data-testid="hero-demo">
                <Play className="h-5 w-5" /> Try the guided demo
              </Button>
              <Button asChild size="lg" variant="outline" className="h-12 px-6 text-base" data-testid="hero-create">
                <Link to="/create"><Plus className="h-5 w-5" /> Create an agent</Link>
              </Button>
            </div>
          </div>

          {/* preview card */}
          <div className="animate-fade-up rounded-2xl border border-border bg-card p-6 shadow-lg" style={{ animationDelay: "120ms" }}>
            <div className="mb-3 flex items-center gap-2">
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary"><Hexagon className="h-5 w-5" /></span>
              <div>
                <p className="font-heading text-sm font-bold">Urban Waterlogging Analysis Agent</p>
                <p className="text-xs text-muted-foreground">Civil engineering · sample data</p>
              </div>
            </div>
            <ol className="space-y-2 text-sm">
              {["Check the information provided", "Read the data records", "Summarise and find patterns", "Organise findings into a report", "Run the quality checklist"].map((s, i) => (
                <li key={i} className="flex items-center gap-3 rounded-lg border border-border bg-background px-3 py-2">
                  <span className="grid h-6 w-6 place-items-center rounded-full bg-primary/10 text-xs font-bold text-primary">{i + 1}</span>
                  {s}
                </li>
              ))}
            </ol>
            <p className="mt-3 text-xs text-muted-foreground">
              A live, runnable example — not a mockup. Open it from the community demos below.
            </p>
          </div>
        </div>
      </section>

      {/* SOCIAL GOOD BANNER */}
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6" aria-labelledby="theme-heading">
        <h2 id="theme-heading" className="font-heading text-2xl font-bold sm:text-3xl">How this fits the theme</h2>
        <div className="mt-6 grid gap-5 md:grid-cols-3">
          {[
            { icon: Languages, title: "Lower the knowledge barrier", body: "Describe a problem in ordinary language. The Master Agent handles the technical choices and explains every term in plain words." },
            { icon: Accessibility, title: "Inclusive by design", body: "Keyboard navigation, visible focus, screen-reader labels, strong contrast and a mobile-friendly layout — accessibility isn't an afterthought." },
            { icon: HeartHandshake, title: "Built for community good", body: "Domain experts and community groups can investigate issues like flooding or street accessibility and organise evidence for review." },
          ].map((c, i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-6 shadow-sm">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary"><c.icon className="h-6 w-6" /></span>
              <h3 className="mt-4 font-heading text-lg font-semibold">{c.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{c.body}</p>
            </div>
          ))}
        </div>
        <p className="mt-4 rounded-lg border border-border bg-muted/50 p-3 text-sm text-muted-foreground">
          <ShieldCheck className="mr-1.5 inline h-4 w-4" />
          This is a prototype. It demonstrates how the platform could help — it has not produced real-world impact,
          and its sample results are for demonstration, not professional advice.
        </p>
      </section>

      {/* COMMUNITY DEMOS */}
      <section className="mx-auto max-w-7xl px-4 pb-4 sm:px-6" aria-labelledby="demos-heading">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 id="demos-heading" className="font-heading text-2xl font-bold sm:text-3xl">Community demos</h2>
            <p className="mt-1 text-sm text-muted-foreground">One-click sample agents. You can describe problems in any other domain too.</p>
          </div>
        </div>
        <div className="mt-6 grid gap-6 md:grid-cols-2">
          {templates.map((t) => (
            <article key={t.template_id} className="flex flex-col rounded-xl border border-border bg-card p-6 shadow-sm transition-colors hover:border-primary/50" data-testid={`template-card-${t.template_id}`}>
              <div className="flex items-center gap-2">
                <span className="rounded-full border border-indigo-300 bg-indigo-100 px-2.5 py-0.5 text-xs font-bold text-indigo-900 dark:border-indigo-800 dark:bg-indigo-950 dark:text-indigo-200">Sample data</span>
                <span className="text-xs font-medium text-muted-foreground">{t.domain}</span>
              </div>
              <h3 className="mt-3 font-heading text-xl font-bold">{t.name}</h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">{t.tagline}</p>
              <p className="mt-3 rounded-lg bg-muted/60 p-3 text-xs italic text-muted-foreground">“{t.example_prompt.slice(0, 160)}…”</p>
              <Button className="mt-4 w-fit" onClick={() => openSample(t.template_id)} disabled={busy === t.template_id} data-testid={`template-open-${t.template_id}`}>
                {busy === t.template_id ? <><Loader2 className="h-4 w-4 animate-spin" /> Creating…</> : <>Open sample agent <ArrowRight className="h-4 w-4" /></>}
              </Button>
            </article>
          ))}
        </div>
      </section>

      {/* USER AGENTS */}
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6" aria-labelledby="agents-heading">
        <div className="flex items-end justify-between gap-4">
          <h2 id="agents-heading" className="font-heading text-2xl font-bold sm:text-3xl">Your agents</h2>
          {agents.length > 0 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" data-testid="reset-demo"><Trash2 className="h-4 w-4" /> Reset demo data</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Clear all saved demo data?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This permanently deletes every agent and run history saved on the server for this demo. This cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={resetDemo} data-testid="reset-demo-confirm">Yes, clear everything</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>

        {loading ? (
          <p className="mt-6 inline-flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</p>
        ) : agents.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-border bg-card/50 p-10 text-center" data-testid="agents-empty">
            <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-primary"><Plus className="h-7 w-7" /></span>
            <h3 className="mt-4 font-heading text-lg font-semibold">No custom agents yet</h3>
            <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
              Launch the short guided wizard to turn a plain-language problem into a working agent, or open a community demo above.
            </p>
            <div className="mt-5 flex justify-center gap-3">
              <Button onClick={guidedDemo}><Play className="h-4 w-4" /> Try the guided demo</Button>
              <Button asChild variant="outline"><Link to="/create"><Plus className="h-4 w-4" /> Create an agent</Link></Button>
            </div>
          </div>
        ) : (
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {agents.map((a) => (
              <Link key={a.id} to={`/agents/${a.id}`} data-testid={`agent-card-${a.id}`}
                className="group flex flex-col rounded-xl border border-border bg-card p-5 shadow-sm transition-all hover:border-primary/50 hover:shadow-md">
                <div className="flex items-center justify-between gap-2">
                  <AgentStatusBadge status={a.status} />
                  {a.is_sample && <span className="rounded-full border border-indigo-300 bg-indigo-100 px-2 py-0.5 text-[11px] font-bold text-indigo-900 dark:border-indigo-800 dark:bg-indigo-950 dark:text-indigo-200">Sample</span>}
                </div>
                <h3 className="mt-3 font-heading text-lg font-bold leading-snug group-hover:text-primary">{a.name}</h3>
                <p className="mt-1 line-clamp-2 flex-1 text-sm text-muted-foreground">{a.purpose}</p>
                <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1"><Database className="h-3.5 w-3.5" /> v{a.version} · {a.run_count} run(s)</span>
                  <span>{timeAgo(a.updated_at)}</span>
                </div>
                {a.published && (
                  <span className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                    <Rocket className="h-3.5 w-3.5" /> Live at /a/{a.slug}
                  </span>
                )}
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* DATA HANDLING */}
      <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6">
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h2 className="inline-flex items-center gap-2 font-heading text-lg font-bold"><FlaskConical className="h-5 w-5 text-primary" /> Where your data is stored</h2>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">
            Everything you create is saved on this application's own server database so your agents and published
            pages survive a refresh. This is a demo environment — please don't paste real personal, medical or
            otherwise sensitive records. You can clear all saved demo data at any time with the “Reset demo data” button.
          </p>
        </div>
      </section>
    </div>
  );
}

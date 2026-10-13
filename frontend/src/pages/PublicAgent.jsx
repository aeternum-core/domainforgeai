import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Loader2, Hexagon, ShieldAlert, Rocket } from "lucide-react";
import { api } from "@/lib/api";
import { RunView } from "@/components/RunView";
import { WorkflowDiagram } from "@/components/WorkflowDiagram";

export default function PublicAgent() {
  const { slug } = useParams();
  const [agent, setAgent] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.publicAgent(slug)
      .then((a) => { setAgent(a); setError(null); })
      .catch((e) => setError(e?.response?.status === 404 ? "unavailable" : "error"))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return <div className="mx-auto max-w-5xl px-4 py-24 text-center text-muted-foreground"><Loader2 className="mx-auto h-6 w-6 animate-spin" /></div>;
  }

  if (error) {
    return (
      <div className="mx-auto max-w-xl px-4 py-24 text-center">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"><ShieldAlert className="h-7 w-7" /></span>
        <h1 className="mt-4 font-heading text-2xl font-bold">This agent isn't available</h1>
        <p className="mt-2 text-muted-foreground">
          The agent at <code className="rounded bg-muted px-1.5 py-0.5 text-sm">/a/{slug}</code> is not currently published,
          or it has been unpublished. The public run endpoint is disabled.
        </p>
        <Link to="/" className="mt-5 inline-block font-semibold text-primary hover:underline">← Back to DomainForge</Link>
      </div>
    );
  }

  const onRun = (payload) => api.runPublic(slug, payload);

  return (
    <div className="animate-fade-in">
      <section className="border-b border-border bg-card/60">
        <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"><Rocket className="h-3 w-3" /> Published agent</span>
            <span className="rounded-full border border-border bg-muted px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">{agent.domain}</span>
            {agent.is_sample && <span className="rounded-full border border-indigo-300 bg-indigo-100 px-2.5 py-0.5 text-xs font-bold text-indigo-900 dark:border-indigo-800 dark:bg-indigo-950 dark:text-indigo-200">Sample data</span>}
          </div>
          <h1 className="mt-3 font-heading text-3xl font-extrabold tracking-tight sm:text-4xl">{agent.name}</h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">{agent.purpose}</p>
          <Link to="/" className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-primary">
            <Hexagon className="h-3.5 w-3.5" /> Built with DomainForge
          </Link>
        </div>
      </section>

      <div className="mx-auto max-w-5xl space-y-8 px-4 py-10 sm:px-6">
        <RunView
          inputs={agent.inputs}
          hasSample={agent.has_sample_data}
          sampleInfo={agent.sample_data_info}
          onRun={onRun}
          idPrefix="public"
        />

        <section>
          <h2 className="mb-3 font-heading text-xl font-bold">What this agent does</h2>
          <WorkflowDiagram workflow={agent.workflow} />
        </section>

        <section className="rounded-xl border border-amber-300 bg-amber-50 p-5 dark:border-amber-800 dark:bg-amber-950/40">
          <h2 className="font-heading text-lg font-bold text-amber-900 dark:text-amber-200">Please read — limitations</h2>
          <ul className="mt-2 list-disc space-y-1 pl-4 text-sm text-amber-900/90 dark:text-amber-200/90">
            {agent.limitations?.map((l, i) => <li key={i}>{l}</li>)}
          </ul>
        </section>
      </div>
    </div>
  );
}

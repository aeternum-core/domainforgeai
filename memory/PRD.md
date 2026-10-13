# DomainForge AI — PRD

## Original problem statement
A platform that helps non-IT domain experts use AI to analyse problems in their own fields.
A user describes a problem in plain language; a "Master Agent" turns it into a proposed
specialised agent the user can configure, test, evaluate, improve with feedback, and publish
as a shareable public page. Hackathon theme: **Accessibility & Social Good**.
Tagline: "You understand the problem. We help build the agent."

## Architecture
- **Frontend:** React (CRA + CRACO), Tailwind, shadcn/ui, lucide-react, React Router, next-themes.
- **Backend:** FastAPI, all routes under `/api`.
- **DB:** MongoDB (`agents`, `runs` collections). UUID string ids, ISO datetimes, `{_id:0}` projections.
- **Engine:** `backend/agent_engine.py` — deterministic Master-Agent generator + agent runtime
  (5 built-in tools). `backend/samples.py` — 2 community demo templates + synthetic datasets.
- **Demo mode:** fully offline, no API keys. Optional live LLM can be added server-side later.

## User personas
- Civil engineer / municipal planner investigating recurring waterlogging.
- Community group documenting public-space accessibility barriers.
- Any non-technical domain expert (health, agriculture, education, …).
- A visitor using a published agent via its shareable link.

## Core requirements (static)
1. Dashboard/landing with tagline, guided-demo + create CTAs, agent cards, theme explainer, demo labels.
2. Guided plain-language creation wizard → editable Master-Agent proposal.
3. Agent workspace: Overview, Workflow, Data & tools, Run, Results, Activity, Improve, Deploy.
4. Real deterministic runtime that executes workflow + built-in tools and returns structured results.
5. Run/inspect/improve with checklist evaluation + natural-language feedback → versions.
6. Deploy: Draft→Test→Publish, pre-publish checklist (incl. a successful test run), public page at
   `/a/:slug`, public run endpoint `POST /api/agents/:slug/run`, unpublish disables it.
7. Community demos: Urban Waterlogging Analysis Agent + Community Accessibility Audit (sample data).
8. Accessibility: keyboard nav, visible focus, aria labels, contrast, mobile, reduced-motion.
9. Transparent data handling + reset demo; README + judge demo script.

## Implemented (2026-06, v1 MVP complete)
- Backend: templates, instantiate, generate, agent CRUD, owner/public run, runs history, feedback
  (versioned revisions), versions, prepublish checklist, publish/unpublish, public config, demo reset, stats.
- Deterministic generator (domain-flavour detection) + runtime with 5 tools, report builder,
  checklist evaluator, CSV/JSON record parsing, feedback-rule revisions.
- Frontend: Dashboard, 4-step CreateWizard (with proposal editor), Workspace (8 tabs, editable
  name/purpose/workflow), shared RunView (animated step execution + structured results),
  PublicAgent page, NotFound, theme toggle, skip link, focus styles.
- README.md + DEMO_SCRIPT.md + test_credentials.md (no auth).
- Verified: curl e2e + testing agent (backend 11/11 pytest, frontend Playwright 100%, no bugs).

## Backlog (prioritised)
- P1: Optional live LLM endpoint (server-side, env key) as an enhancement over Demo mode.
- P2: Export report to PDF/CSV; richer charts (Recharts) in Results.
- P2: More community demo templates (public health, agriculture).
- P2: Reorder/add workflow steps in the editor (currently edit title/description + remove).
- P3: Multi-user ownership / auth if ever needed (currently open demo).

## Next tasks
- Await user feedback on the MVP; implement an enhancement from the backlog on request.

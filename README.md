# DomainForge AI

**You understand the problem. We help build the agent.**

DomainForge is a no-code platform that lets non-IT **domain experts** turn a plain-language
description of a real-world problem into a working, specialised AI agent — then test, improve,
and publish it as a page anyone can use. Built for the **Accessibility & Social Good** theme.

> ⚠️ This is a hackathon prototype. It runs in **Demo mode** with deterministic, built-in tools —
> not a live AI model. Sample data is clearly labelled and synthetic. It has **not** produced
> real-world impact and must not be used for engineering, medical, or accessibility certification.

---

## Stack

This project runs on the pre-provisioned full-stack template:

- **Frontend:** React (CRA + CRACO), Tailwind CSS, shadcn/ui, lucide-react, React Router
- **Backend:** FastAPI (Python)
- **Database:** MongoDB (persists agents, versions, runs, and published pages)

> The original brief suggested Vite/Node/SQLite *if the workspace were empty*. Because a working
> React + FastAPI + MongoDB environment was already set up, the app adapts to it (brief point #3).

---

## Running the app

Both services are managed by **supervisor** and start automatically.

```bash
# restart if needed
sudo supervisorctl restart backend
sudo supervisorctl restart frontend

# logs
tail -n 100 /var/log/supervisor/backend.*.log
tail -n 100 /var/log/supervisor/frontend.*.log
```

- Frontend is served on port **3000**, backend on **8001** (all API routes are prefixed `/api`).
- The frontend calls the backend via `REACT_APP_BACKEND_URL` (see `frontend/.env`).
- The backend reads `MONGO_URL` and `DB_NAME` from `backend/.env`.

Open the app at the URL in `frontend/.env` (`REACT_APP_BACKEND_URL`).

---

## How Demo mode works

The app works **with no API keys and no paid services**. The "Master Agent" that drafts an agent,
and the agent runtime that executes workflows, are both **deterministic** (`backend/agent_engine.py`).

Built-in tools used in every run:

1. **Required-information check** — confirms needed inputs are present.
2. **Structured data reader** — reads sample data or pasted CSV/JSON.
3. **Record summariser** — counts, groups and finds simple patterns.
4. **Report organiser** — lays findings out in clear sections.
5. **Quality checklist** — evaluates the result (pass / needs review / not assessed).

Each tool's status and output is shown live in the Run tab's activity log. No result is ever
presented as coming from a real AI model.

### Optional live AI (not required)

Demo mode is complete on its own. If you later wire a live LLM, do it **server-side** only:
add a new endpoint in `backend/server.py`, read the key from an environment variable
(e.g. `EMERGENT_LLM_KEY`), and keep Demo mode as the default fallback. **Never** put keys in
frontend code or commit secrets.

---

## How agent publishing works

Agents move through **Draft → Test → Publish**:

1. **Draft** — created from the wizard or a community demo.
2. **Test** — a successful test run (all required inputs present) is required before publishing.
3. **Publish** — passes a pre-publish checklist, then snapshots the **tested version** and assigns
   a stable slug. The public page lives at `/a/:slug` and is backed by `POST /api/agents/:slug/run`.

- Published agents always run the **saved, tested snapshot**. Editing or giving feedback after
  publishing creates a new version but leaves the live version unchanged until you re-test and
  re-publish.
- **Unpublishing** disables both the public page and its run endpoint immediately.
- Everything is persisted in MongoDB, so shareable URLs keep working after a refresh.

> The published page is live **within this running application** and persisted on its server.
> It is not pushed to the public internet. To host it publicly, deploy this app and its MongoDB
> (any Node/Python host + managed MongoDB) and the same `/a/:slug` URLs will work on your domain.

---

## Key API endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/api/agents/generate` | Master Agent drafts an editable proposal |
| POST | `/api/agents` | Save an agent |
| GET/PUT/DELETE | `/api/agents/{id}` | Read / edit / delete an agent |
| POST | `/api/agents/{id}/run?mode=owner` | Owner test run (working config) |
| POST | `/api/agents/{slug}/run` | **Public run of the published version** |
| POST | `/api/agents/{id}/feedback` | Save feedback as a new version |
| GET | `/api/agents/{id}/prepublish` | Pre-publish checklist state |
| POST | `/api/agents/{id}/publish` / `/unpublish` | Publish / unpublish |
| GET | `/api/public/agents/{slug}` | Public (owner-control-free) config |
| GET | `/api/templates` · POST `/api/templates/{id}/instantiate` | Community demos |
| POST | `/api/demo/reset` | Clear all demo agents and runs |

---

## Data handling

Agents and runs are stored in this app's own MongoDB. This is a demo environment — **do not paste
real personal, medical, or sensitive records.** Use **Reset demo data** on the dashboard to clear
everything at any time.

---

## Judge demo script

See [`DEMO_SCRIPT.md`](./DEMO_SCRIPT.md) for a ~3-minute walkthrough.

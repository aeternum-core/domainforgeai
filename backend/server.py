from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import ReturnDocument
import os
import logging
import copy
import requests as http_requests
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

import agent_engine as engine
import samples

try:  # launched as `backend.server` (the default)
    from backend.clerk_auth import clerk_router, require_user, verify_session_token
except ModuleNotFoundError:  # launched from inside backend/ as `server`
    from clerk_auth import clerk_router, require_user, verify_session_token

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

try:
    from backend.app.db import db, client
    from backend.app.routers.runs import router as runs_router
    from backend.app.routers.public import router as public_router
except ModuleNotFoundError:
    from app.db import db, client
    from app.routers.runs import router as runs_router
    from app.routers.public import router as public_router

app = FastAPI(title="DomainForge AI")
api_router = APIRouter(prefix="/api")
api_router.include_router(runs_router)
api_router.include_router(public_router)

logging.basicConfig(level=logging.INFO,
                    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("domainforge")


# ---------------------------------------------------------------------------
# Roles & access control (Emergent-managed Clerk auth)
# ---------------------------------------------------------------------------
ROLES = ["admin", "member"]
DEFAULT_ROLE = "member"
RETIRED_ROLES = {}
RANK = {r: len(ROLES) - i for i, r in enumerate(ROLES)}

ENV = "live" if os.environ.get("CLERK_PUBLISHABLE_KEY", "").startswith("pk_live_") else "preview"
IN_ENV = {"env": {"$in": [ENV, None]}}


def effective_role(role) -> str:
    role = RETIRED_ROLES.get(role, role)
    return role if role in ROLES else DEFAULT_ROLE


def _is_admin_email(user_id: str) -> bool:
    if not os.environ.get("CLERK_SECRET_KEY"):
        return True
    admins = {e.strip().lower() for e in os.environ.get("ADMIN_EMAIL", "").split(",") if e.strip()}
    if not admins:
        return False
    try:
        r = http_requests.get(
            f"https://api.clerk.com/v1/users/{user_id}", timeout=10,
            headers={"Authorization": f"Bearer {os.environ['CLERK_SECRET_KEY']}", "User-Agent": "domainforge-app"})
        r.raise_for_status()
        return any(e["email_address"].lower() in admins and (e.get("verification") or {}).get("status") == "verified"
                   for e in r.json()["email_addresses"])
    except Exception:
        return False


def _user_email(user_id: str):
    if not os.environ.get("CLERK_SECRET_KEY"):
        return "demo@domainforge.ai"
    try:
        r = http_requests.get(
            f"https://api.clerk.com/v1/users/{user_id}", timeout=10,
            headers={"Authorization": f"Bearer {os.environ['CLERK_SECRET_KEY']}", "User-Agent": "domainforge-app"})
        r.raise_for_status()
        d = r.json()
        pid = d.get("primary_email_address_id")
        emails = d.get("email_addresses", [])
        for e in emails:
            if e["id"] == pid:
                return e["email_address"]
        if emails:
            return emails[0]["email_address"]
    except Exception:
        pass
    return "demo@domainforge.ai"


async def _load_member(user: dict) -> dict:
    uid = user["user_id"]
    member = await db.users.find_one({"user_id": uid}, {"_id": 0})
    if member is None or not member.get("role"):
        role = "admin" if _is_admin_email(uid) else DEFAULT_ROLE
        await db.users.update_one({"user_id": uid, "role": {"$in": [None, ""]}}, {"$set": {"role": role}})
        member = await db.users.find_one_and_update(
            {"user_id": uid}, {"$setOnInsert": {"user_id": uid, "role": role}},
            upsert=True, projection={"_id": 0}, return_document=ReturnDocument.AFTER)
    if member.get("env") != ENV:
        await db.users.update_one({"user_id": uid}, {"$set": {"env": ENV}})
    return {**member, "env": ENV, "role": effective_role(member["role"])}


async def current_member(user: dict = Depends(require_user)) -> dict:
    return await _load_member(user)


def require_role(*roles: str):
    async def check(member: dict = Depends(current_member)) -> dict:
        if member["role"] not in roles:
            raise HTTPException(status_code=403, detail="Not allowed")
        return member
    return check


async def member_from_request(request: Request) -> dict:
    """Manual resolve for mixed public/owner endpoints."""
    return await _load_member(require_user(request))


def can_manage(agent: dict, member: dict) -> bool:
    if member["role"] == "admin":
        return True
    owner = agent.get("owner_id")
    if not owner:  # legacy / ownerless demo agents: any signed-in user may manage
        return True
    return owner == member["user_id"]


async def get_managed_agent(agent_id: str, member: dict) -> dict:
    agent = await get_agent_or_404(agent_id)
    if not can_manage(agent, member):
        raise HTTPException(status_code=403, detail="You can only manage agents you created.")
    return agent


# ---------------------------------------------------------------------------
# Models (loose — the agent config is a rich nested document)
# ---------------------------------------------------------------------------
class GenerateRequest(BaseModel):
    domain: str = ""
    problem: str = ""
    beneficiaries: str = ""
    data_description: str = ""
    outcome: str = ""
    constraints: str = ""
    name: str = ""
    prompt: str = ""


class SaveAgentRequest(BaseModel):
    proposal: Dict[str, Any]
    template_id: Optional[str] = None
    sample_data: Optional[Dict[str, Any]] = None


class UpdateAgentRequest(BaseModel):
    name: Optional[str] = None
    purpose: Optional[str] = None
    domain: Optional[str] = None
    problem: Optional[str] = None
    beneficiaries: Optional[str] = None
    constraints: Optional[str] = None
    inputs: Optional[List[Dict[str, Any]]] = None
    outputs: Optional[List[str]] = None
    workflow: Optional[List[Dict[str, Any]]] = None
    tools: Optional[List[Dict[str, Any]]] = None
    checks: Optional[List[Dict[str, Any]]] = None
    limitations: Optional[List[str]] = None
    assumptions: Optional[List[str]] = None


class RunRequest(BaseModel):
    inputs: Dict[str, Any] = Field(default_factory=dict)
    raw_records: Optional[str] = None
    records: Optional[List[Dict[str, Any]]] = None
    use_sample: bool = False


class FeedbackRequest(BaseModel):
    text: str


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def clean(doc):
    if doc and "_id" in doc:
        doc.pop("_id", None)
    return doc


async def get_agent_or_404(agent_id):
    agent = await db.agents.find_one({"id": agent_id}, {"_id": 0})
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    return agent


async def unique_slug(base):
    slug = engine.slugify(base)
    candidate = slug
    i = 2
    while await db.agents.find_one({"slug": candidate}, {"_id": 0}):
        candidate = f"{slug}-{i}"
        i += 1
    return candidate


def agent_summary(a):
    return {
        "id": a["id"], "name": a.get("name"), "purpose": a.get("purpose"),
        "domain": a.get("domain"), "status": a.get("status"), "slug": a.get("slug"),
        "published": a.get("published", False), "is_sample": a.get("is_sample", False),
        "version": a.get("version", 1), "run_count": a.get("run_count", 0),
        "test_passed": a.get("test_passed", False),
        "has_sample_data": bool(a.get("sample_data")),
        "owner_id": a.get("owner_id"), "owner_email": a.get("owner_email"),
        "updated_at": a.get("updated_at"), "created_at": a.get("created_at"),
    }


# ---------------------------------------------------------------------------
# Health + templates
# ---------------------------------------------------------------------------
@api_router.get("/")
async def root():
    return {"message": "DomainForge AI API", "mode": "demo"}


@api_router.get("/templates")
async def list_templates():
    return [
        {k: t[k] for k in ("template_id", "name", "domain", "tagline", "problem",
                           "beneficiaries", "data_description", "outcome", "constraints",
                           "example_prompt", "sample_data")}
        for t in samples.TEMPLATES
    ]


@api_router.post("/templates/{template_id}/instantiate")
async def instantiate_template(template_id: str, member: dict = Depends(current_member)):
    t = samples.get_template(template_id)
    if not t:
        raise HTTPException(status_code=404, detail="Template not found")
    proposal = engine.generate_proposal({
        "domain": t["domain"], "problem": t["problem"], "beneficiaries": t["beneficiaries"],
        "data_description": t["data_description"], "outcome": t["outcome"],
        "constraints": t["constraints"], "name": t["name"], "prompt": t["example_prompt"],
    })
    agent = await _create_agent(proposal, sample_data=t["sample_data"], is_sample=True,
                                template_id=template_id, owner_id=member["user_id"],
                                owner_email=_user_email(member["user_id"]))
    return agent


# ---------------------------------------------------------------------------
# Generate proposal (Master Agent)
# ---------------------------------------------------------------------------
@api_router.post("/agents/generate")
async def generate(req: GenerateRequest):
    proposal = engine.generate_proposal(req.model_dump())
    return {"proposal": proposal, "mode": "demo",
            "note": "Generated deterministically in Demo mode — not from a live AI model."}


# ---------------------------------------------------------------------------
# CRUD
# ---------------------------------------------------------------------------
async def _create_agent(proposal, sample_data=None, is_sample=False, template_id=None,
                        owner_id=None, owner_email=None):
    agent = copy.deepcopy(proposal)
    agent["id"] = engine.new_id()
    agent["status"] = "draft"
    agent["published"] = False
    agent["slug"] = None
    agent["is_sample"] = is_sample
    agent["template_id"] = template_id
    agent["owner_id"] = owner_id
    agent["owner_email"] = owner_email
    agent["version"] = 1
    agent["run_count"] = 0
    agent["test_passed"] = False
    agent["sample_data"] = sample_data
    agent["published_version"] = None
    agent["improvement_notes"] = agent.get("improvement_notes", [])
    agent["created_at"] = engine.now_iso()
    agent["updated_at"] = engine.now_iso()

    # Synchronize schema fields
    if not agent.get("problem_statement") and agent.get("problem"):
        agent["problem_statement"] = agent["problem"]
    elif not agent.get("problem") and agent.get("problem_statement"):
        agent["problem"] = agent["problem_statement"]

    if not agent.get("expected_outputs") and agent.get("outputs"):
        agent["expected_outputs"] = list(agent["outputs"])
    elif not agent.get("outputs") and agent.get("expected_outputs"):
        agent["outputs"] = list(agent["expected_outputs"])

    if not agent.get("workflow_steps") and agent.get("workflow"):
        agent["workflow_steps"] = list(agent["workflow"])
    elif not agent.get("workflow") and agent.get("workflow_steps"):
        agent["workflow"] = list(agent["workflow_steps"])

    if not agent.get("tools_config") and agent.get("tools"):
        agent["tools_config"] = list(agent["tools"])
    elif not agent.get("tools") and agent.get("tools_config"):
        agent["tools"] = list(agent["tools_config"])

    agent["versions"] = [{
        "version": 1, "note": "Initial version", "created_at": engine.now_iso(),
        "snapshot": _snapshot(agent),
    }]
    agent["feedback"] = []
    await db.agents.insert_one(copy.deepcopy(agent))
    return clean(agent)


def _snapshot(agent):
    keys = ["name", "purpose", "domain", "problem", "problem_statement", "beneficiaries", "constraints",
            "inputs", "outputs", "expected_outputs", "workflow", "workflow_steps", "tools", "tools_config",
            "checks", "limitations", "assumptions", "improvement_notes"]
    return {k: copy.deepcopy(agent.get(k)) for k in keys}


@api_router.post("/agents")
async def create_agent(req: SaveAgentRequest, member: dict = Depends(current_member)):
    agent = await _create_agent(req.proposal, sample_data=req.sample_data,
                                template_id=req.template_id, owner_id=member["user_id"],
                                owner_email=_user_email(member["user_id"]))
    return agent


@api_router.get("/agents")
async def list_agents():
    agents = await db.agents.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return [agent_summary(a) for a in agents]


@api_router.get("/agents/{agent_id}")
async def get_agent(agent_id: str):
    return await get_agent_or_404(agent_id)


@api_router.put("/agents/{agent_id}")
async def update_agent(agent_id: str, req: UpdateAgentRequest, member: dict = Depends(current_member)):
    await get_managed_agent(agent_id, member)
    updates = {k: v for k, v in req.model_dump().items() if v is not None}
    if not updates:
        return await get_agent_or_404(agent_id)
    updates["updated_at"] = engine.now_iso()
    await db.agents.update_one({"id": agent_id}, {"$set": updates})
    return await get_agent_or_404(agent_id)


@api_router.delete("/agents/{agent_id}")
async def delete_agent(agent_id: str, member: dict = Depends(current_member)):
    await get_managed_agent(agent_id, member)
    await db.agents.delete_one({"id": agent_id})
    await db.runs.delete_many({"agent_id": agent_id})
    return {"ok": True}


# ---------------------------------------------------------------------------
# Run (owner uses ?mode=owner with id; public uses slug)
# ---------------------------------------------------------------------------
@api_router.post("/agents/{ref}/run")
async def run_agent_endpoint(ref: str, req: RunRequest, request: Request, mode: str = "public"):
    run_input = req.model_dump()

    if mode == "owner":
        agent = await db.agents.find_one({"id": ref}, {"_id": 0})
        if not agent:
            raise HTTPException(status_code=404, detail="Agent not found")
        member = await member_from_request(request)
        if not can_manage(agent, member):
            raise HTTPException(status_code=403, detail="You can only run agents you manage.")
        config = agent
        version_run = agent.get("version", 1)
        source = "owner"
    else:
        agent = await db.agents.find_one({"slug": ref}, {"_id": 0})
        if not agent:
            raise HTTPException(status_code=404, detail="Published agent not found")
        if not agent.get("published") or not agent.get("published_version"):
            raise HTTPException(status_code=403,
                                detail="This agent is not currently published.")
        config = copy.deepcopy(agent)
        config.update(agent["published_version"])  # run the tested, published snapshot
        version_run = agent["published_version"].get("version", agent.get("version", 1))
        source = "public"

    try:
        outcome = engine.run_agent(config, run_input)
    except Exception as e:  # noqa
        logger.exception("run failed")
        raise HTTPException(status_code=500, detail=f"Run failed: {e}")

    run_doc = {
        "id": engine.new_id(), "agent_id": agent["id"], "slug": agent.get("slug"),
        "source": source, "mode": mode, "version_run": version_run,
        "input": run_input, "steps": outcome["steps"], "result": outcome["result"],
        "created_at": engine.now_iso(),
    }
    await db.runs.insert_one(copy.deepcopy(run_doc))

    update = {"$inc": {"run_count": 1}}
    if mode == "owner":
        # a run with all required inputs present counts as a successful test run
        passed = not any(s["tool"] == "check_inputs" and s["status"] == "warning"
                         for s in outcome["steps"])
        if passed:
            update["$set"] = {"test_passed": True, "status": "test",
                              "updated_at": engine.now_iso()}
    await db.agents.update_one({"id": agent["id"]}, update)

    return clean(run_doc)


@api_router.get("/agents/{agent_id}/runs")
async def get_runs(agent_id: str, limit: int = 25):
    runs = await db.runs.find({"agent_id": agent_id}, {"_id": 0}) \
        .sort("created_at", -1).to_list(limit)
    return runs


# ---------------------------------------------------------------------------
# Feedback -> new version
# ---------------------------------------------------------------------------
@api_router.post("/agents/{agent_id}/feedback")
async def submit_feedback(agent_id: str, req: FeedbackRequest, member: dict = Depends(current_member)):
    agent = await get_managed_agent(agent_id, member)
    before = _snapshot(agent)
    updated, changes = engine.apply_feedback(copy.deepcopy(agent), req.text)
    new_version = agent.get("version", 1) + 1
    updated["version"] = new_version
    updated["updated_at"] = engine.now_iso()
    # editing invalidates the published live version until re-tested & re-published
    updated["test_passed"] = False
    if updated.get("status") == "published":
        updated["status"] = "test"

    fb_entry = {"id": engine.new_id(), "text": req.text, "changes": changes,
                "created_at": engine.now_iso(), "resulting_version": new_version}
    version_entry = {"version": new_version,
                     "note": "; ".join(changes), "created_at": engine.now_iso(),
                     "snapshot": _snapshot(updated),
                     "feedback": req.text}

    await db.agents.update_one({"id": agent_id}, {"$set": {
        "workflow": updated.get("workflow"),
        "checks": updated.get("checks"),
        "improvement_notes": updated.get("improvement_notes", []),
        "version": new_version,
        "updated_at": updated["updated_at"],
        "test_passed": False,
        "status": updated.get("status"),
    }, "$push": {"feedback": fb_entry, "versions": version_entry}})

    fresh = await get_agent_or_404(agent_id)
    return {"agent": fresh, "changes": changes, "before": before,
            "after": _snapshot(updated), "version": new_version}


@api_router.get("/agents/{agent_id}/versions")
async def get_versions(agent_id: str):
    agent = await get_agent_or_404(agent_id)
    return {"versions": agent.get("versions", []), "current": agent.get("version", 1)}


# ---------------------------------------------------------------------------
# Deploy: pre-publish checklist / publish / unpublish
# ---------------------------------------------------------------------------
def prepublish_checklist(agent):
    items = [
        {"id": "has_name", "label": "Agent has a name and purpose",
         "ok": bool(agent.get("name") and agent.get("purpose"))},
        {"id": "has_workflow", "label": "Workflow has at least one step",
         "ok": len(agent.get("workflow", [])) >= 1},
        {"id": "has_limitations", "label": "Limitations are documented",
         "ok": len(agent.get("limitations", [])) >= 1},
        {"id": "test_run", "label": "At least one successful test run completed",
         "ok": bool(agent.get("test_passed"))},
    ]
    return items


@api_router.get("/agents/{agent_id}/prepublish")
async def get_prepublish(agent_id: str, member: dict = Depends(current_member)):
    agent = await get_managed_agent(agent_id, member)
    items = prepublish_checklist(agent)
    return {"items": items, "ready": all(i["ok"] for i in items)}


@api_router.post("/agents/{agent_id}/publish")
async def publish_agent(agent_id: str, member: dict = Depends(current_member)):
    agent = await get_managed_agent(agent_id, member)
    items = prepublish_checklist(agent)
    if not all(i["ok"] for i in items):
        failed = [i["label"] for i in items if not i["ok"]]
        raise HTTPException(status_code=400,
                            detail=f"Cannot publish yet: {', '.join(failed)}")
    slug = agent.get("slug") or await unique_slug(agent.get("name", "agent"))
    snapshot = _snapshot(agent)
    snapshot["version"] = agent.get("version", 1)
    snapshot["sample_data"] = agent.get("sample_data")
    await db.agents.update_one({"id": agent_id}, {"$set": {
        "slug": slug, "published": True, "status": "published",
        "published_version": snapshot, "published_at": engine.now_iso(),
        "updated_at": engine.now_iso(),
    }})
    return await get_agent_or_404(agent_id)


@api_router.post("/agents/{agent_id}/unpublish")
async def unpublish_agent(agent_id: str, member: dict = Depends(current_member)):
    await get_managed_agent(agent_id, member)
    await db.agents.update_one({"id": agent_id}, {"$set": {
        "published": False, "status": "test", "updated_at": engine.now_iso(),
    }})
    return await get_agent_or_404(agent_id)


# ---------------------------------------------------------------------------
# Public published view (safe subset, no owner controls)
# ---------------------------------------------------------------------------
@api_router.get("/public/agents/{slug}")
@api_router.get("/public/{slug}")
async def public_agent(slug: str):
    agent = await db.agents.find_one({"slug": slug}, {"_id": 0})
    if not agent or not agent.get("published") or not agent.get("published_version"):
        raise HTTPException(status_code=404, detail="Published agent not available")
    pv = agent["published_version"]
    return {
        "slug": slug,
        "name": pv.get("name"), "purpose": pv.get("purpose"), "domain": pv.get("domain"),
        "problem": pv.get("problem"), "beneficiaries": pv.get("beneficiaries"),
        "inputs": pv.get("inputs"), "outputs": pv.get("outputs"),
        "workflow": pv.get("workflow"), "tools": pv.get("tools"),
        "limitations": pv.get("limitations"), "assumptions": pv.get("assumptions"),
        "has_sample_data": bool(pv.get("sample_data")),
        "sample_data_info": ({"name": pv["sample_data"].get("name"),
                              "description": pv["sample_data"].get("description"),
                              "count": len(pv["sample_data"].get("records", []))}
                             if pv.get("sample_data") else None),
        "version": pv.get("version"),
        "is_sample": agent.get("is_sample", False),
        "published_at": agent.get("published_at"),
    }


# ---------------------------------------------------------------------------
# Demo reset (admin only)
# ---------------------------------------------------------------------------
@api_router.post("/demo/reset")
async def reset_demo(admin: dict = Depends(require_role("admin"))):
    await db.agents.delete_many({})
    await db.runs.delete_many({})
    return {"ok": True, "message": "All demo agents and runs were cleared."}


@api_router.get("/stats")
async def stats():
    return {
        "agents": await db.agents.count_documents({}),
        "published": await db.agents.count_documents({"published": True}),
        "runs": await db.runs.count_documents({}),
    }


# ---------------------------------------------------------------------------
# Current user / admin
# ---------------------------------------------------------------------------
@api_router.get("/me")
async def me(request: Request):
    if not os.environ.get("CLERK_SECRET_KEY"):
        return {"signed_in": False, "auth_enabled": False}
    auth = request.headers.get("authorization", "")
    token = auth[7:] if auth.lower().startswith("bearer ") else request.cookies.get("__session", "")
    if not token:
        return {"signed_in": False, "auth_enabled": True}
    try:
        claims = verify_session_token(token)
    except HTTPException:
        return {"signed_in": False, "auth_enabled": True}
    member = await _load_member({"user_id": claims["sub"]})
    return {"signed_in": True, "auth_enabled": True,
            "user_id": member["user_id"], "role": member["role"],
            "email": member.get("owner_email") or _user_email(member["user_id"])}


@api_router.get("/users")
async def list_users(admin: dict = Depends(require_role("admin"))):
    people = await db.users.find(IN_ENV, {"_id": 0}).to_list(1000)
    return {"roles": [r for r in ROLES if RANK[r] <= RANK[admin["role"]]],
            "users": [{**p, "role": effective_role(p.get("role"))} for p in people]}


app.include_router(api_router)
app.include_router(clerk_router)  # /api/clerk/config and /api/__clerk/*

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

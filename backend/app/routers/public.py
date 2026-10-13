import uuid
import json
import asyncio
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse

try:
    from backend.app.db import get_db
    from backend.app.schemas.run import RunCreateRequest, RunInitResponse
    from backend.app.services.agent_runner import execute_agent_workflow, now_iso
    from backend.app.routers.runs import ACTIVE_RUNS
except ModuleNotFoundError:
    from app.db import get_db
    from app.schemas.run import RunCreateRequest, RunInitResponse
    from app.services.agent_runner import execute_agent_workflow, now_iso
    from app.routers.runs import ACTIVE_RUNS

router = APIRouter(prefix="/public", tags=["public"])


@router.get("/{slug}")
@router.get("/agents/{slug}")
async def get_public_agent(slug: str, db=Depends(get_db)):
    """Retrieve published agent details by slug for standalone execution."""
    agent = await db.agents.find_one({"slug": slug}, {"_id": 0})
    if not agent or not agent.get("published"):
        raise HTTPException(status_code=404, detail="Published agent not available")

    pv = agent.get("published_version") or agent
    return {
        "slug": slug,
        "agent_id": agent.get("id"),
        "name": pv.get("name"),
        "purpose": pv.get("purpose"),
        "domain": pv.get("domain"),
        "problem": pv.get("problem") or pv.get("problem_statement"),
        "problem_statement": pv.get("problem_statement") or pv.get("problem"),
        "beneficiaries": pv.get("beneficiaries"),
        "inputs": pv.get("inputs", []),
        "outputs": pv.get("outputs") or pv.get("expected_outputs", []),
        "expected_outputs": pv.get("expected_outputs") or pv.get("outputs", []),
        "workflow": pv.get("workflow") or pv.get("workflow_steps", []),
        "workflow_steps": pv.get("workflow_steps") or pv.get("workflow", []),
        "tools": pv.get("tools") or pv.get("tools_config", []),
        "tools_config": pv.get("tools_config") or pv.get("tools", []),
        "limitations": pv.get("limitations", []),
        "assumptions": pv.get("assumptions", []),
        "has_sample_data": bool(pv.get("sample_data")),
        "sample_data_info": (
            {
                "name": pv["sample_data"].get("name"),
                "description": pv["sample_data"].get("description"),
                "count": len(pv["sample_data"].get("records", [])),
            }
            if pv.get("sample_data")
            else None
        ),
        "version": pv.get("version", 1),
        "is_sample": agent.get("is_sample", False),
        "published_at": agent.get("published_at"),
    }


@router.post("/{slug}/runs", response_model=RunInitResponse)
async def create_public_run(slug: str, req: RunCreateRequest, db=Depends(get_db)):
    """Initiate a standalone live run on a published agent."""
    agent = await db.agents.find_one({"slug": slug}, {"_id": 0})
    if not agent or not agent.get("published"):
        raise HTTPException(status_code=403, detail="This agent is not currently published.")

    run_id = str(uuid.uuid4())
    run_input = req.model_dump()
    pv = agent.get("published_version") or agent

    run_doc = {
        "run_id": run_id,
        "id": run_id,
        "agent_id": agent["id"],
        "slug": slug,
        "status": "running",
        "inputs": run_input.get("inputs") or run_input,
        "raw_records": run_input.get("raw_records"),
        "use_sample": run_input.get("use_sample", False),
        "events": [],
        "result": None,
        "created_at": now_iso(),
        "source": "public",
        "mode": "public",
        "version_run": pv.get("version", agent.get("version", 1)),
    }

    await db.runs.insert_one(run_doc)

    ACTIVE_RUNS[run_id] = {
        "agent": pv,
        "inputs": run_input,
        "started": False,
    }

    return RunInitResponse(run_id=run_id, status="running")


@router.get("/{slug}/runs/{run_id}/stream")
async def stream_public_run(slug: str, run_id: str, db=Depends(get_db)):
    """SSE stream for standalone published run."""
    agent = await db.agents.find_one({"slug": slug}, {"_id": 0})
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")

    async def sse_event_generator():
        run_info = ACTIVE_RUNS.get(run_id)
        if run_info and not run_info.get("started"):
            run_info["started"] = True
            async for chunk in execute_agent_workflow(run_info["agent"], run_info["inputs"], run_id, db):
                data = json.dumps(chunk, default=str)
                yield f"data: {data}\n\n"
                await asyncio.sleep(0.01)
                if chunk.get("event") in ["run_completed", "run_failed"]:
                    break
            ACTIVE_RUNS.pop(run_id, None)
        else:
            run_doc = await db.runs.find_one({"$or": [{"run_id": run_id}, {"id": run_id}]}, {"_id": 0})
            if not run_doc:
                yield f"data: {json.dumps({'event': 'error', 'message': 'Run not found'})}\n\n"
                return
            for trace in run_doc.get("events", []):
                yield f"data: {json.dumps({'event': 'step_progress', 'run_id': run_id, 'trace': trace})}\n\n"
                await asyncio.sleep(0.05)
            if run_doc.get("status") == "completed":
                yield f"data: {json.dumps({'event': 'run_completed', 'run_id': run_id, 'status': 'completed', 'result': run_doc.get('result')})}\n\n"
            elif run_doc.get("status") == "failed":
                yield f"data: {json.dumps({'event': 'run_failed', 'run_id': run_id, 'status': 'failed', 'error': run_doc.get('error')})}\n\n"

    return StreamingResponse(
        sse_event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )

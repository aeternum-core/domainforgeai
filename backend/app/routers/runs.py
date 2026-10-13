import uuid
import json
import asyncio
from typing import Dict, Any, Optional
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse

try:
    from backend.app.db import get_db
    from backend.app.schemas.run import RunCreateRequest, RunInitResponse
    from backend.app.services.agent_runner import execute_agent_workflow, now_iso
except ModuleNotFoundError:
    from app.db import get_db
    from app.schemas.run import RunCreateRequest, RunInitResponse
    from app.services.agent_runner import execute_agent_workflow, now_iso

router = APIRouter(prefix="/agents", tags=["runs"])

# In-memory registry for pending/active stream executions
ACTIVE_RUNS: Dict[str, Dict[str, Any]] = {}


@router.post("/{agent_id}/runs", response_model=RunInitResponse)
async def create_agent_run(agent_id: str, req: RunCreateRequest, db=Depends(get_db)):
    """Initialize a live agent run and return run_id for streaming."""
    agent = await db.agents.find_one({"id": agent_id}, {"_id": 0})
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")

    run_id = str(uuid.uuid4())
    run_input = req.model_dump()

    run_doc = {
        "run_id": run_id,
        "id": run_id,
        "agent_id": agent_id,
        "status": "running",
        "inputs": run_input.get("inputs") or run_input,
        "raw_records": run_input.get("raw_records"),
        "use_sample": run_input.get("use_sample", False),
        "events": [],
        "result": None,
        "created_at": now_iso(),
        "source": "owner",
        "mode": "owner",
        "version_run": agent.get("version", 1),
    }

    await db.runs.insert_one(run_doc)

    # Store in ACTIVE_RUNS queue for the stream consumer
    ACTIVE_RUNS[run_id] = {
        "agent": agent,
        "inputs": run_input,
        "started": False,
    }

    return RunInitResponse(run_id=run_id, status="running")


@router.get("/{agent_id}/runs/{run_id}/stream")
async def stream_agent_run(agent_id: str, run_id: str, db=Depends(get_db)):
    """Server-Sent Events (SSE) streaming endpoint for live workflow execution."""
    agent = await db.agents.find_one({"id": agent_id}, {"_id": 0})
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")

    async def sse_event_generator():
        # Check if in active runs
        run_info = ACTIVE_RUNS.get(run_id)
        if run_info and not run_info.get("started"):
            run_info["started"] = True
            async for chunk in execute_agent_workflow(run_info["agent"], run_info["inputs"], run_id, db):
                data = json.dumps(chunk, default=str)
                yield f"data: {data}\n\n"
                # Short yield to ensure flush
                await asyncio.sleep(0.01)
                if chunk.get("event") in ["run_completed", "run_failed"]:
                    break
            # Remove from active queue once done
            ACTIVE_RUNS.pop(run_id, None)
        else:
            # Run was already executed or reconnected: replay from DB
            run_doc = await db.runs.find_one({"$or": [{"run_id": run_id}, {"id": run_id}]}, {"_id": 0})
            if not run_doc:
                yield f"data: {json.dumps({'event': 'error', 'message': 'Run not found'})}\n\n"
                return

            # Replay events
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


@router.get("/{agent_id}/runs/{run_id}")
async def get_agent_run(agent_id: str, run_id: str, db=Depends(get_db)):
    """Retrieve persisted run details and full event activity trace."""
    run_doc = await db.runs.find_one(
        {"agent_id": agent_id, "$or": [{"run_id": run_id}, {"id": run_id}]},
        {"_id": 0}
    )
    if not run_doc:
        raise HTTPException(status_code=404, detail="Run not found")
    return run_doc

from typing import List, Dict, Any, Optional, Union
from pydantic import BaseModel, Field
try:
    from backend.app.models.run import EventTrace, QualityCheckItem, RunResult
except ModuleNotFoundError:
    from app.models.run import EventTrace, QualityCheckItem, RunResult


class RunCreateRequest(BaseModel):
    inputs: Union[Dict[str, Any], str] = Field(default_factory=dict)
    raw_records: Optional[str] = None
    records: Optional[List[Dict[str, Any]]] = None
    use_sample: bool = False


class RunInitResponse(BaseModel):
    run_id: str
    status: str = "running"
    message: Optional[str] = "Workflow execution started"


class RunDetailResponse(BaseModel):
    run_id: str
    agent_id: str
    status: str
    inputs: Union[Dict[str, Any], str]
    events: List[EventTrace] = Field(default_factory=list)
    result: Optional[RunResult] = None
    created_at: str
    completed_at: Optional[str] = None
    error: Optional[str] = None
    id: Optional[str] = None
    steps: Optional[List[Dict[str, Any]]] = None

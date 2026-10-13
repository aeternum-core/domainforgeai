from typing import List, Dict, Any, Optional, Union
from pydantic import BaseModel, Field
from datetime import datetime, timezone


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


class EventTrace(BaseModel):
    timestamp: str = Field(default_factory=now_iso)
    step_name: str
    status: str = "ok"  # "ok" | "running" | "warning" | "failed" | "completed"
    message: str = ""
    tool_call: Optional[str] = None
    tool_output: Optional[Any] = None


class QualityCheckItem(BaseModel):
    item: str
    status: str = "pass"  # "pass" | "needs_review"
    comment: str = ""


class RunResult(BaseModel):
    summary: str = ""
    key_patterns: List[str] = Field(default_factory=list)
    data_gaps_and_questions: List[str] = Field(default_factory=list)
    quality_checklist: List[QualityCheckItem] = Field(default_factory=list)
    raw_markdown: str = ""

    # Optional helpers for legacy components and UI sections
    report: Optional[Dict[str, Any]] = None
    used_inputs: Optional[List[Dict[str, Any]]] = None
    assumptions: Optional[List[str]] = None
    limitations: Optional[List[str]] = None
    checklist: Optional[List[Dict[str, Any]]] = None
    records_count: Optional[int] = None
    record_source: Optional[str] = None


class RunModel(BaseModel):
    run_id: str
    agent_id: str
    status: str = "pending"  # "pending" | "running" | "completed" | "failed"
    inputs: Union[Dict[str, Any], str] = Field(default_factory=dict)
    events: List[EventTrace] = Field(default_factory=list)
    result: Optional[RunResult] = None
    created_at: str = Field(default_factory=now_iso)
    completed_at: Optional[str] = None
    error: Optional[str] = None

    # Compatibility aliases
    id: Optional[str] = None
    slug: Optional[str] = None
    source: Optional[str] = "owner"
    mode: Optional[str] = "owner"
    version_run: Optional[int] = 1
    steps: Optional[List[Dict[str, Any]]] = Field(default_factory=list)

    def model_post_init(self, __context: Any) -> None:
        if not self.id and self.run_id:
            self.id = self.run_id
        elif self.id and not self.run_id:
            self.run_id = self.id

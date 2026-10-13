from typing import Dict, Any, Optional
from pydantic import BaseModel, Field
from datetime import datetime, timezone


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


class PublishedModel(BaseModel):
    slug: str
    agent_id: str
    published_at: str = Field(default_factory=now_iso)
    rate_limit_config: Dict[str, Any] = Field(default_factory=lambda: {"requests_per_minute": 60, "burst": 10})
    version: int = 1
    snapshot: Optional[Dict[str, Any]] = None

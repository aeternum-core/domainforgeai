from typing import Dict, Any, Optional
from pydantic import BaseModel, Field


class PublishRequestSchema(BaseModel):
    rate_limit_config: Optional[Dict[str, Any]] = None


class PublishedAgentResponseSchema(BaseModel):
    slug: str
    agent_id: str
    published_at: str
    rate_limit_config: Dict[str, Any] = Field(default_factory=dict)
    name: Optional[str] = None
    purpose: Optional[str] = None
    domain: Optional[str] = None
    problem: Optional[str] = None
    problem_statement: Optional[str] = None
    beneficiaries: Optional[str] = None
    inputs: Optional[Any] = None
    expected_outputs: Optional[Any] = None
    workflow_steps: Optional[Any] = None
    tools_config: Optional[Any] = None
    limitations: Optional[Any] = None
    assumptions: Optional[Any] = None
    has_sample_data: bool = False
    sample_data_info: Optional[Dict[str, Any]] = None
    version: int = 1

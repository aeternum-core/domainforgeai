from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field


class AgentCreateSchema(BaseModel):
    proposal: Dict[str, Any]
    template_id: Optional[str] = None
    sample_data: Optional[Dict[str, Any]] = None


class AgentUpdateSchema(BaseModel):
    name: Optional[str] = None
    purpose: Optional[str] = None
    domain: Optional[str] = None
    problem: Optional[str] = None
    problem_statement: Optional[str] = None
    beneficiaries: Optional[str] = None
    constraints: Optional[str] = None
    inputs: Optional[List[Dict[str, Any]]] = None
    outputs: Optional[List[str]] = None
    expected_outputs: Optional[List[str]] = None
    workflow: Optional[List[Dict[str, Any]]] = None
    workflow_steps: Optional[List[Dict[str, Any]]] = None
    tools: Optional[List[Dict[str, Any]]] = None
    tools_config: Optional[List[Dict[str, Any]]] = None
    checks: Optional[List[Dict[str, Any]]] = None
    limitations: Optional[List[str]] = None
    assumptions: Optional[List[str]] = None


class AgentResponseSchema(BaseModel):
    id: str
    name: str
    domain: str
    beneficiaries: str
    problem_statement: str = ""
    version: int = 1
    status: str = "draft"
    expected_outputs: List[str] = Field(default_factory=list)
    limitations: List[str] = Field(default_factory=list)
    assumptions: List[str] = Field(default_factory=list)
    workflow_steps: List[Dict[str, Any]] = Field(default_factory=list)
    tools_config: List[Dict[str, Any]] = Field(default_factory=list)

    purpose: Optional[str] = None
    problem: Optional[str] = None
    slug: Optional[str] = None
    published: bool = False
    is_sample: bool = False
    inputs: List[Dict[str, Any]] = Field(default_factory=list)
    sample_data: Optional[Dict[str, Any]] = None
    test_passed: bool = False
    run_count: int = 0
    owner_id: Optional[str] = None
    owner_email: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


class GenerateRequestSchema(BaseModel):
    domain: str = ""
    problem: str = ""
    problem_statement: str = ""
    beneficiaries: str = ""
    data_description: str = ""
    outcome: str = ""
    constraints: str = ""
    name: str = ""
    prompt: str = ""

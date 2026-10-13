from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field


class AgentModel(BaseModel):
    id: str
    name: str
    domain: str
    beneficiaries: str
    problem_statement: str = Field(default="")
    version: int = 1
    status: str = Field(default="draft")  # "draft" | "published" | "test"
    expected_outputs: List[str] = Field(default_factory=list)
    limitations: List[str] = Field(default_factory=list)
    assumptions: List[str] = Field(default_factory=list)
    workflow_steps: List[Dict[str, Any]] = Field(default_factory=list)
    tools_config: List[Dict[str, Any]] = Field(default_factory=list)

    # Backward compatibility and additional metadata fields
    problem: Optional[str] = None
    purpose: Optional[str] = None
    domain_flavour: Optional[str] = None
    constraints: Optional[str] = None
    inputs: List[Dict[str, Any]] = Field(default_factory=list)
    outputs: Optional[List[str]] = None
    workflow: Optional[List[Dict[str, Any]]] = None
    tools: Optional[List[Dict[str, Any]]] = None
    checks: List[Dict[str, Any]] = Field(default_factory=list)
    slug: Optional[str] = None
    published: bool = False
    is_sample: bool = False
    template_id: Optional[str] = None
    owner_id: Optional[str] = None
    owner_email: Optional[str] = None
    run_count: int = 0
    test_passed: bool = False
    sample_data: Optional[Dict[str, Any]] = None
    published_version: Optional[Dict[str, Any]] = None
    improvement_notes: List[str] = Field(default_factory=list)
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    published_at: Optional[str] = None
    versions: List[Dict[str, Any]] = Field(default_factory=list)
    feedback: List[Dict[str, Any]] = Field(default_factory=list)

    def model_post_init(self, __context: Any) -> None:
        # Sync aliases for robust compatibility across frontend, tests, and new schemas
        if not self.problem_statement and self.problem:
            self.problem_statement = self.problem
        elif self.problem_statement and not self.problem:
            self.problem = self.problem_statement

        if not self.expected_outputs and self.outputs:
            self.expected_outputs = list(self.outputs)
        elif self.expected_outputs and not self.outputs:
            self.outputs = list(self.expected_outputs)

        if not self.workflow_steps and self.workflow:
            self.workflow_steps = list(self.workflow)
        elif self.workflow_steps and not self.workflow:
            self.workflow = list(self.workflow_steps)

        if not self.tools_config and self.tools:
            self.tools_config = list(self.tools)
        elif self.tools_config and not self.tools:
            self.tools = list(self.tools_config)

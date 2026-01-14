from typing import List, Literal
from pydantic import BaseModel, Field

class Bottleneck(BaseModel):
    id: str = Field(..., description="Unique ID for the bottleneck (e.g., PERF-001)")
    type: Literal["CPU", "I/O", "Network", "Memory"] = Field(
        ..., description="The primary resource being exhausted"
    )
    component: str = Field(..., description="The component from the registry causing the issue")
    observation: str = Field(
        ..., description="The specific detail in the blueprint that leads to this bottleneck"
    )
    impact: str = Field(
        ..., description="The failure mode when traffic hits peak (e.g., 50k users)"
    )
    severity: Literal["Critical", "High", "Medium"] = Field(..., description="Urgency of the fix")
    remediation: str = Field(
        ..., description="The specific architectural change needed (e.g., Implement Redis caching)"
    )

class ScalabilityBlocker(BaseModel):
    issue: str = Field(..., description="The architectural flaw preventing growth")
    why_it_blocks_scaling: str = Field(
        ..., description="Detailed explanation of why horizontal scaling is impossible (e.g., session stickiness, local disk)"
    )

class ReliabilityScore(BaseModel):
    # conint(ge=0, le=100) ensures the AI provides a valid percentage
    score: int = Field(..., ge=0, le=100, description="Overall reliability score out of 100")
    justification: str = Field(..., description="Brief reasoning for the assigned score")

class PerformanceReview(BaseModel):
    """The master schema for the Performance Architect agent output."""
    summary: str = Field(..., description="High-level view of system efficiency")
    bottlenecks: List[Bottleneck] = Field(default_factory=list)
    scalability_blockers: List[ScalabilityBlocker] = Field(default_factory=list)
    reliability_score: ReliabilityScore
    
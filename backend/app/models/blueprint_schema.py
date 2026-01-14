from typing import List, Literal
from pydantic import BaseModel, Field

class SystemIdentity(BaseModel):
    name: str = Field(..., description="The name of the system being analyzed")
    primary_style: Literal["Monolith", "Microservices", "Serverless", "Hybrid"] = Field(
        ..., description="The high-level architectural pattern"
    )
    deployment_target: str = Field(..., description="Where the system is hosted (e.g., EC2, K8s)")
    stated_goals: List[str] = Field(default_factory=list, description="Primary objectives of the system")

class Component(BaseModel):
    name: str
    type: str = Field(..., description="Category like Database, Web Server, or Queue")
    technology: str = Field(default="unknown")
    hosting: str = Field(..., description="Specific hosting environment for this component")
    statefulness: Literal["Stateful", "Stateless", "Unknown"]

class Interaction(BaseModel):
    source: str
    destination: str
    protocol: str = Field(default="unknown")
    data_exchanged: str
    nature: Literal["Synchronous", "Asynchronous"]

class TechnicalConstraints(BaseModel):
    traffic_expectations: str
    performance_requirements: List[str] = Field(default_factory=list)
    security_requirements: List[str] = Field(default_factory=list)

class Omission(BaseModel):
    missing_from_diagram: List[str] = Field(default_factory=list)
    missing_from_text: List[str] = Field(default_factory=list)

class DocBlueprint(BaseModel):
    """The master schema for the Blueprint Specialist agent output."""
    is_valid: bool = Field(..., description="True if the doc meets technical requirements")
    validation_errors: List[str] = Field(default_factory=list, description="List of missing requirements")
    
    system_identity: SystemIdentity
    component_registry: List[Component]
    interaction_map: List[Interaction]
    technical_constraints: TechnicalConstraints
    omission: Omission
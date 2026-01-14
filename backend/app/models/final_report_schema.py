from pydantic import BaseModel, Field
from typing import List, Optional

class Scorecard(BaseModel):
    architecture_health: str = Field(..., description="Overall health status (e.g., 85/100 or 'Healthy')")
    primary_risks: str = Field(..., description="The single most critical security or stability risk")
    primary_bottleneck: str = Field(..., description="The main performance or scalability constraint")

class Finding(BaseModel):
    priority: str = Field(..., description="High, Medium, or Low")
    category: str = Field(..., description="e.g., Security, Performance, Scalability")
    finding: str = Field(..., description="Brief title of the issue")
    impact: str = Field(..., description="Impact on the business or system")
    fix: str = Field(..., description="Recommended technical resolution")

class ReviewReport(BaseModel):
    # This flag handles the 'graceful response' requirement
    data_available: bool = Field(..., description="True if blueprint data was sufficient for analysis")
    generated_at: str = Field(..., description="Current system Timestamp of when the report was generated")
    
    scorecard: Optional[Scorecard] = None
    findings: Optional[List[Finding]] = []
    deep_dive: Optional[str] = Field(
        None, 
        description="2-3 paragraphs of deep-dive mentorship on structural issues."
    )
    
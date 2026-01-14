from typing import List, Literal
from pydantic import BaseModel, Field

class Vulnerability(BaseModel):
    id: str = Field(..., description="Unique identifier for the vulnerability (e.g., SEC-001)")
    category: Literal[
        "Spoofing", 
        "Tampering", 
        "Repudiation", 
        "Information Disclosure", 
        "Denial of Service", 
        "Elevation of Privilege"
    ] = Field(..., description="The STRIDE category of the threat")
    owasp_mapping: str = Field(..., description="Relevant OWASP Top 10 mapping (e.g., A01:2025)")
    component_impacted: str = Field(..., description="The specific component from the blueprint registry")
    threat_description: str = Field(..., description="Detailed explanation of the risk")
    attack_vector: str = Field(..., description="Step-by-step description of how an attacker would exploit this")
    severity: Literal["Critical", "High", "Medium", "Low"] = Field(..., description="Risk level based on impact and likelihood")
    mitigation_strategy: str = Field(..., description="Specific, actionable technical recommendation to fix the issue")

class SecurityReview(BaseModel):
    """The master schema for the Security Sentinel agent output."""
    summary: str = Field(..., description="A high-level overview of the system's security posture")
    vulnerabilities: List[Vulnerability] = Field(default_factory=list)
    trust_boundary_violations: List[str] = Field(
        default_factory=list, 
        description="List of areas where data crosses from untrusted to trusted zones without validation"
    )
    missing_security_controls: List[str] = Field(
        default_factory=list, 
        description="Critical security items missing from the architecture (e.g., No MFA, No WAF)"
    )
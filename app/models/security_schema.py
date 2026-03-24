from typing import List, Literal, Optional
from pydantic import BaseModel, Field, field_validator

_STRIDE_SPOOFING = "Spoofing"
_STRIDE_TAMPERING = "Tampering"
_STRIDE_REPUDIATION = "Repudiation"
_STRIDE_INFO_DISCLOSURE = "Information Disclosure"
_STRIDE_DENIAL_OF_SERVICE = "Denial of Service"
_STRIDE_ELEVATION = "Elevation of Privilege"

StrideCategory = Literal[
    "Spoofing",
    "Tampering",
    "Repudiation",
    "Information Disclosure",
    "Denial of Service",
    "Elevation of Privilege",
]

_STRIDE_KEYWORDS: dict[str, str] = {
    "spoof": _STRIDE_SPOOFING,
    "tamper": _STRIDE_TAMPERING,
    "repudiat": _STRIDE_REPUDIATION,
    "information": _STRIDE_INFO_DISCLOSURE,
    "disclosure": _STRIDE_INFO_DISCLOSURE,
    "denial": _STRIDE_DENIAL_OF_SERVICE,
    "dos": _STRIDE_DENIAL_OF_SERVICE,
    "elevation": _STRIDE_ELEVATION,
    "privilege": _STRIDE_ELEVATION,
}

_VALID_STRIDE: frozenset[str] = frozenset(_STRIDE_KEYWORDS.values())

class Vulnerability(BaseModel):
    id: str = Field(..., description="Unique identifier for the vulnerability (e.g., SEC-001)")
    category: StrideCategory = Field(..., description="The STRIDE category of the threat")
    owasp_mapping: str = Field(..., description="Relevant OWASP Top 10 mapping (e.g., A01:2025)")
    component_impacted: str = Field(..., description="The specific component from the blueprint registry")
    threat_description: str = Field(..., description="Detailed explanation of the risk")
    attack_vector: str = Field(..., description="Step-by-step description of how an attacker would exploit this")
    severity: Literal["Critical", "High", "Medium", "Low"] = Field(..., description="Risk level based on impact and likelihood")
    mitigation_strategy: str = Field(..., description="Specific, actionable technical recommendation to fix the issue")

    @field_validator("category", mode="before")
    @classmethod
    def coerce_stride_category(cls, v: str) -> str:
        """Map non-STRIDE values to the closest STRIDE category by keyword, fallback to Tampering."""
        if v in _VALID_STRIDE:
            return v
        lower = v.lower()
        for keyword, category in _STRIDE_KEYWORDS.items():
            if keyword in lower:
                return category
        return "Tampering"

class SecurityReview(BaseModel):
    """The master schema for the Security Sentinel agent output."""
    summary: str = Field(..., description="Narrative field. Content format depends on output_format: Markdown, plain prose, or minimal.")
    vulnerabilities: List[Vulnerability] = Field(default_factory=list)
    trust_boundary_violations: List[str] = Field(
        default_factory=list, 
        description="List of areas where data crosses from untrusted to trusted zones without validation"
    )
    missing_security_controls: List[str] = Field(
        default_factory=list, 
        description="Critical security items missing from the architecture (e.g., No MFA, No WAF)"
    )
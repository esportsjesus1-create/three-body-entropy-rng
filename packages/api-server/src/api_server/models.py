"""
Pydantic models for API request/response.

Provides type-safe request and response models.
"""

from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


class CommitRequest(BaseModel):
    """Request to create a new commitment."""
    
    client_seed: Optional[str] = Field(
        None,
        description="Optional client seed for additional entropy",
    )
    num_reels: int = Field(
        5,
        ge=1,
        le=10,
        description="Number of reels (1-10)",
    )


class CommitResponse(BaseModel):
    """Response containing commitment hash."""
    
    commitment_hash: str = Field(
        ...,
        description="SHA-256 hash of committed data",
    )
    timestamp_ms: int = Field(
        ...,
        description="Commitment timestamp in milliseconds",
    )
    nonce: int = Field(
        ...,
        description="Unique nonce for this commitment",
    )
    expires_ms: int = Field(
        ...,
        description="Expiration timestamp in milliseconds",
    )


class RevealRequest(BaseModel):
    """Request to reveal a commitment."""
    
    commitment_hash: str = Field(
        ...,
        description="Commitment hash to reveal",
    )
    client_seed: Optional[str] = Field(
        None,
        description="Client seed provided after commitment",
    )


class RevealResponse(BaseModel):
    """Response containing revealed data."""
    
    commitment_hash: str = Field(
        ...,
        description="Original commitment hash",
    )
    server_seed: str = Field(
        ...,
        description="Server's random seed",
    )
    entropy_hex: str = Field(
        ...,
        description="Entropy from three-body simulation",
    )
    positions: List[int] = Field(
        ...,
        description="Reel positions derived from entropy",
    )
    nonce: int = Field(
        ...,
        description="Commitment nonce",
    )
    timestamp_ms: int = Field(
        ...,
        description="Commitment timestamp",
    )
    verified: bool = Field(
        ...,
        description="Whether commitment verification passed",
    )


class VerifyRequest(BaseModel):
    """Request to verify a commitment."""
    
    commitment_hash: str = Field(
        ...,
        description="Commitment hash to verify",
    )
    server_seed: str = Field(
        ...,
        description="Server seed to verify",
    )
    entropy_hex: str = Field(
        ...,
        description="Entropy to verify",
    )
    nonce: int = Field(
        ...,
        description="Nonce to verify",
    )
    timestamp_ms: int = Field(
        ...,
        description="Timestamp to verify",
    )
    positions: Optional[List[int]] = Field(
        None,
        description="Positions to verify",
    )


class VerifyResponse(BaseModel):
    """Response containing verification result."""
    
    valid: bool = Field(
        ...,
        description="Whether verification passed",
    )
    commitment_matches: bool = Field(
        ...,
        description="Whether hash matches data",
    )
    timestamp_valid: bool = Field(
        ...,
        description="Whether timestamp is valid",
    )
    error: Optional[str] = Field(
        None,
        description="Error message if verification failed",
    )


class HealthResponse(BaseModel):
    """Health check response."""
    
    state: str = Field(
        ...,
        description="Health state: healthy, degraded, or unhealthy",
    )
    version: str = Field(
        ...,
        description="API version",
    )
    uptime_seconds: float = Field(
        ...,
        description="Server uptime in seconds",
    )
    components: Dict[str, Any] = Field(
        default_factory=dict,
        description="Component health status",
    )
    timestamp_ms: int = Field(
        ...,
        description="Status timestamp",
    )


class PublicKeyResponse(BaseModel):
    """Response containing public key."""
    
    public_key_pem: str = Field(
        ...,
        description="RSA public key in PEM format",
    )
    algorithm: str = Field(
        "RSA-4096-PSS-SHA256",
        description="Signature algorithm",
    )


class ErrorResponse(BaseModel):
    """Error response."""
    
    error: str = Field(
        ...,
        description="Error type",
    )
    message: str = Field(
        ...,
        description="Error message",
    )
    retry_after: Optional[float] = Field(
        None,
        description="Seconds to wait before retry (for rate limiting)",
    )

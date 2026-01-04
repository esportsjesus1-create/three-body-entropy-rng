"""
API Server - FastAPI endpoints for Three-Body RNG

This module provides the HTTP API for the Three-Body RNG system.
It uses the crypto-service, physics-engine, and commitment-protocol
modules as dependencies.

Key Features:
- Commit/reveal endpoints for provably fair RNG
- Rate limiting middleware
- Health checks
- OpenAPI documentation
"""

from .app import create_app
from .rate_limiter import RateLimiter, RateLimitExceeded
from .health import HealthStatus, get_health_status

__all__ = [
    "create_app",
    "RateLimiter",
    "RateLimitExceeded",
    "HealthStatus",
    "get_health_status",
]

__version__ = "1.0.0"

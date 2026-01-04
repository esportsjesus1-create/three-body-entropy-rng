"""
FastAPI application factory.

Creates and configures the FastAPI application with all routes,
middleware, and dependencies.
"""

import time
import hashlib
import secrets
from typing import Optional, Dict, Any
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .rate_limiter import RateLimiter, RateLimitConfig, RateLimitExceeded
from .health import HealthChecker, HealthState, init_health_checker, get_health_checker
from .models import (
    CommitRequest,
    CommitResponse,
    RevealRequest,
    RevealResponse,
    VerifyRequest,
    VerifyResponse,
    HealthResponse,
    PublicKeyResponse,
    ErrorResponse,
)


class CommitmentStore:
    """
    In-memory commitment storage.
    
    Note: For production, use transparency-log module with SQLite.
    """
    
    def __init__(self):
        self._commitments: Dict[str, Dict[str, Any]] = {}
        self._nonce_counter = 0
    
    def generate_nonce(self) -> int:
        """Generate unique nonce."""
        self._nonce_counter += 1
        random_bits = secrets.randbits(32)
        return (self._nonce_counter << 32) | random_bits
    
    def store(self, commitment_hash: str, data: Dict[str, Any]) -> None:
        """Store commitment data."""
        self._commitments[commitment_hash] = data
    
    def get(self, commitment_hash: str) -> Optional[Dict[str, Any]]:
        """Get commitment data."""
        return self._commitments.get(commitment_hash)
    
    def remove(self, commitment_hash: str) -> None:
        """Remove commitment."""
        self._commitments.pop(commitment_hash, None)


def compute_commitment_hash(
    server_seed: str,
    entropy_hex: str,
    nonce: int,
    timestamp_ms: int,
    positions: list,
) -> str:
    """Compute SHA-256 commitment hash."""
    parts = [
        f"server_seed:{server_seed}",
        f"entropy:{entropy_hex}",
        f"nonce:{nonce}",
        f"timestamp:{timestamp_ms}",
        f"positions:{','.join(str(p) for p in positions)}",
    ]
    data = "|".join(parts)
    return hashlib.sha256(data.encode('utf-8')).hexdigest()


def generate_entropy(seed: str, num_reels: int) -> tuple:
    """
    Generate entropy and positions.
    
    Note: For production, use physics-engine module.
    This is a simplified version for standalone testing.
    """
    # Generate deterministic entropy from seed
    entropy = hashlib.sha256(seed.encode('utf-8')).hexdigest()
    
    # Derive positions from entropy
    positions = []
    for i in range(num_reels):
        # Use different parts of entropy for each reel
        chunk = entropy[i*8:(i+1)*8]
        position = int(chunk, 16) % 10  # 10 symbols per reel
        positions.append(position)
    
    return entropy, positions


def create_app(
    rate_limit_config: Optional[RateLimitConfig] = None,
    commitment_expiry_ms: int = 300000,  # 5 minutes
) -> FastAPI:
    """
    Create FastAPI application.
    
    Args:
        rate_limit_config: Rate limiting configuration
        commitment_expiry_ms: Commitment expiration time in ms
        
    Returns:
        Configured FastAPI application
    """
    
    # Initialize components
    rate_limiter = RateLimiter(rate_limit_config)
    commitment_store = CommitmentStore()
    health_checker = init_health_checker("1.0.0")
    health_checker.register_component("rate_limiter")
    health_checker.register_component("commitment_store")
    
    @asynccontextmanager
    async def lifespan(app: FastAPI):
        """Application lifespan handler."""
        health_checker.update_component("rate_limiter", HealthState.HEALTHY)
        health_checker.update_component("commitment_store", HealthState.HEALTHY)
        yield
        # Cleanup on shutdown
        rate_limiter.reset_all()
    
    app = FastAPI(
        title="Three-Body RNG API",
        description="Provably fair random number generation using three-body physics",
        version="1.0.0",
        lifespan=lifespan,
    )
    
    # Add CORS middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    
    # Rate limiting middleware
    @app.middleware("http")
    async def rate_limit_middleware(request: Request, call_next):
        # Skip rate limiting for health checks
        if request.url.path in ["/health", "/healthz", "/"]:
            return await call_next(request)
        
        client_ip = request.client.host if request.client else "unknown"
        
        try:
            rate_limiter.check(client_ip)
        except RateLimitExceeded as e:
            return JSONResponse(
                status_code=429,
                content={
                    "error": "rate_limit_exceeded",
                    "message": str(e),
                    "retry_after": e.retry_after,
                },
                headers={"Retry-After": str(int(e.retry_after) + 1)},
            )
        
        response = await call_next(request)
        
        # Add rate limit headers
        remaining = rate_limiter.get_remaining(client_ip)
        response.headers["X-RateLimit-Remaining"] = str(remaining)
        
        return response
    
    # Exception handlers
    @app.exception_handler(HTTPException)
    async def http_exception_handler(request: Request, exc: HTTPException):
        return JSONResponse(
            status_code=exc.status_code,
            content={"error": "http_error", "message": exc.detail},
        )
    
    # Routes
    @app.get("/", include_in_schema=False)
    async def root():
        """Root endpoint."""
        return {"message": "Three-Body RNG API", "version": "1.0.0"}
    
    @app.get("/health", response_model=HealthResponse)
    async def health_check():
        """Health check endpoint."""
        status = health_checker.get_status()
        return status.to_dict()
    
    @app.get("/healthz")
    async def healthz():
        """Kubernetes-style health check."""
        if health_checker.is_healthy():
            return {"status": "ok"}
        raise HTTPException(status_code=503, detail="Service unhealthy")
    
    @app.post("/commit", response_model=CommitResponse)
    async def create_commitment(request: CommitRequest):
        """
        Create a new commitment.
        
        The commitment hash is shown to the player BEFORE they
        provide their input, proving the result was predetermined.
        """
        # Generate server seed
        server_seed = secrets.token_hex(32)
        
        # Generate entropy and positions
        entropy_hex, positions = generate_entropy(server_seed, request.num_reels)
        
        # Create commitment
        nonce = commitment_store.generate_nonce()
        timestamp_ms = int(time.time() * 1000)
        expires_ms = timestamp_ms + commitment_expiry_ms
        
        commitment_hash = compute_commitment_hash(
            server_seed=server_seed,
            entropy_hex=entropy_hex,
            nonce=nonce,
            timestamp_ms=timestamp_ms,
            positions=positions,
        )
        
        # Store commitment data
        commitment_store.store(commitment_hash, {
            "server_seed": server_seed,
            "entropy_hex": entropy_hex,
            "nonce": nonce,
            "timestamp_ms": timestamp_ms,
            "positions": positions,
            "expires_ms": expires_ms,
            "client_seed": request.client_seed,
        })
        
        return CommitResponse(
            commitment_hash=commitment_hash,
            timestamp_ms=timestamp_ms,
            nonce=nonce,
            expires_ms=expires_ms,
        )
    
    @app.post("/reveal", response_model=RevealResponse)
    async def reveal_commitment(request: RevealRequest):
        """
        Reveal a commitment.
        
        After the player provides their input, reveal the
        committed data so they can verify the result.
        """
        # Get stored commitment
        data = commitment_store.get(request.commitment_hash)
        
        if data is None:
            raise HTTPException(
                status_code=404,
                detail="Commitment not found",
            )
        
        # Check expiration
        current_time = int(time.time() * 1000)
        if current_time > data["expires_ms"]:
            commitment_store.remove(request.commitment_hash)
            raise HTTPException(
                status_code=410,
                detail="Commitment expired",
            )
        
        # Verify commitment hash
        computed_hash = compute_commitment_hash(
            server_seed=data["server_seed"],
            entropy_hex=data["entropy_hex"],
            nonce=data["nonce"],
            timestamp_ms=data["timestamp_ms"],
            positions=data["positions"],
        )
        
        verified = computed_hash == request.commitment_hash
        
        # Remove commitment after reveal (single use)
        commitment_store.remove(request.commitment_hash)
        
        return RevealResponse(
            commitment_hash=request.commitment_hash,
            server_seed=data["server_seed"],
            entropy_hex=data["entropy_hex"],
            positions=data["positions"],
            nonce=data["nonce"],
            timestamp_ms=data["timestamp_ms"],
            verified=verified,
        )
    
    @app.post("/verify", response_model=VerifyResponse)
    async def verify_commitment(request: VerifyRequest):
        """
        Verify a commitment independently.
        
        Allows anyone to verify that revealed data matches
        the original commitment hash.
        """
        # Compute expected hash
        positions = request.positions or []
        computed_hash = compute_commitment_hash(
            server_seed=request.server_seed,
            entropy_hex=request.entropy_hex,
            nonce=request.nonce,
            timestamp_ms=request.timestamp_ms,
            positions=positions,
        )
        
        commitment_matches = computed_hash == request.commitment_hash
        
        # Check timestamp validity (not too old)
        current_time = int(time.time() * 1000)
        age_ms = current_time - request.timestamp_ms
        timestamp_valid = 0 <= age_ms <= commitment_expiry_ms * 2  # Allow 2x expiry for verification
        
        valid = commitment_matches and timestamp_valid
        
        error = None
        if not commitment_matches:
            error = "Commitment hash does not match revealed data"
        elif not timestamp_valid:
            error = f"Commitment too old: {age_ms}ms"
        
        return VerifyResponse(
            valid=valid,
            commitment_matches=commitment_matches,
            timestamp_valid=timestamp_valid,
            error=error,
        )
    
    @app.get("/public-key", response_model=PublicKeyResponse)
    async def get_public_key():
        """
        Get server's public key for signature verification.
        
        Note: For production, use crypto-service module.
        """
        # Placeholder - in production, use RSA key from crypto-service
        return PublicKeyResponse(
            public_key_pem="-----BEGIN PUBLIC KEY-----\nPLACEHOLDER\n-----END PUBLIC KEY-----",
            algorithm="RSA-4096-PSS-SHA256",
        )
    
    # Store references for testing
    app.state.rate_limiter = rate_limiter
    app.state.commitment_store = commitment_store
    app.state.health_checker = health_checker
    
    return app

"""
FastAPI application factory.

Creates and configures the FastAPI application with all routes,
middleware, and dependencies.

Phase C Integration: Now includes transparency-log for audit trail,
sequence gap detection, and commitment lifecycle tracking.
"""

import time
import hashlib
import secrets
from typing import Optional, Dict, Any, List
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

# Phase C: Import transparency-log for audit trail
try:
    from transparency_log import (
        Database,
        DatabaseConfig,
        AuditLog,
        AuditAction,
        CommitmentStore as PersistentCommitmentStore,
    )
    TRANSPARENCY_LOG_AVAILABLE = True
except ImportError:
    TRANSPARENCY_LOG_AVAILABLE = False

# Import physics-engine for real three-body entropy generation
try:
    from physics_engine import generate_entropy_from_seed, SimulationParams
    PHYSICS_ENGINE_AVAILABLE = True
except ImportError:
    PHYSICS_ENGINE_AVAILABLE = False


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
    Generate entropy and positions using real three-body physics simulation.
    
    Uses the physics-engine module for deterministic RK4 three-body simulation.
    Falls back to SHA256 only if physics-engine is not available.
    
    Args:
        seed: Server seed (hex string from secrets.token_hex)
        num_reels: Number of reel positions to generate
        
    Returns:
        Tuple of (entropy_hex, positions)
    """
    if PHYSICS_ENGINE_AVAILABLE:
        # Use real three-body physics simulation
        # Configure simulation parameters for good entropy with reasonable performance
        # Using 500 steps provides good chaos while keeping API response time < 500ms
        params = SimulationParams(
            dt=0.001,      # Time step
            steps=500,     # Number of integration steps (optimized for API performance)
            G=1.0,         # Gravitational constant
            softening=0.01 # Softening parameter
        )
        
        # Ensure seed is valid hex - if not, hash it to get hex
        try:
            # Validate hex format
            bytes.fromhex(seed[:32] if len(seed) >= 32 else seed.ljust(32, '0'))
            seed_hex = seed
        except ValueError:
            # Convert non-hex seed to hex via SHA256
            seed_hex = hashlib.sha256(seed.encode('utf-8')).hexdigest()
        
        # Run physics simulation to generate entropy
        result = generate_entropy_from_seed(seed_hex, params)
        entropy = result["entropy_hex"]
        
        # Log that we're using real physics (for debugging/verification)
        print(f"Physics simulation: {params.steps} steps completed, theta={result['theta_normalized']:.6f}")
    else:
        # Fallback to SHA256 if physics-engine not available
        print("WARNING: Using SHA256 fallback - physics-engine not available")
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
    db_path: str = ":memory:",  # Phase C: SQLite path for persistence
    enable_audit_log: bool = True,  # Phase C: Enable audit logging
    min_commit_reveal_delay_ms: int = 100,  # Phase C TASK 3: Minimum delay between commit and reveal
) -> FastAPI:
    """
    Create FastAPI application.
    
    Args:
        rate_limit_config: Rate limiting configuration
        commitment_expiry_ms: Commitment expiration time in ms
        db_path: SQLite database path for transparency-log
        enable_audit_log: Whether to enable audit logging
        min_commit_reveal_delay_ms: Minimum time between commit and reveal (default 100ms)
            This prevents timing attacks where operator reveals immediately after commit.
        
    Returns:
        Configured FastAPI application
    """
    
    # Initialize components
    rate_limiter = RateLimiter(rate_limit_config)
    commitment_store = CommitmentStore()
    health_checker = init_health_checker("1.0.0")
    health_checker.register_component("rate_limiter")
    health_checker.register_component("commitment_store")
    
    # Phase C: Initialize transparency-log for audit trail
    audit_log: Optional[AuditLog] = None
    database: Optional[Database] = None
    
    if TRANSPARENCY_LOG_AVAILABLE and enable_audit_log:
        try:
            database = Database(DatabaseConfig(db_path=db_path))
            database.initialize()
            audit_log = AuditLog(database)
            health_checker.register_component("audit_log")
        except Exception as e:
            print(f"Warning: Failed to initialize audit log: {e}")
    
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
        
        # Phase C: Log commitment creation to audit trail
        if audit_log:
            audit_log.append(
                action=AuditAction.COMMIT_CREATED,
                commitment_hash=commitment_hash,
                details={
                    "nonce": nonce,
                    "timestamp_ms": timestamp_ms,
                    "expires_ms": expires_ms,
                    "num_reels": request.num_reels,
                },
            )
        
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
        
        Phase C TASK 3: Enforces commit-before-input protocol with timing checks.
        Commitment must exist for at least min_commit_reveal_delay_ms before reveal.
        """
        # Get stored commitment
        data = commitment_store.get(request.commitment_hash)
        
        if data is None:
            raise HTTPException(
                status_code=404,
                detail="Commitment not found",
            )
        
        # Phase C TASK 3: Check minimum delay between commit and reveal
        # This prevents timing attacks where operator reveals immediately after commit
        current_time = int(time.time() * 1000)
        time_since_commit = current_time - data["timestamp_ms"]
        
        if time_since_commit < min_commit_reveal_delay_ms:
            # Log timing violation to audit trail
            if audit_log:
                audit_log.append(
                    action=AuditAction.COMMIT_VERIFIED,  # Using VERIFIED as closest action type
                    commitment_hash=request.commitment_hash,
                    details={
                        "error": "timing_violation",
                        "time_since_commit_ms": time_since_commit,
                        "min_required_ms": min_commit_reveal_delay_ms,
                    },
                )
            raise HTTPException(
                status_code=425,  # Too Early
                detail=f"Reveal too soon. Commitment must be at least {min_commit_reveal_delay_ms}ms old. "
                       f"Current age: {time_since_commit}ms. Wait {min_commit_reveal_delay_ms - time_since_commit}ms.",
            )
        
        # Check expiration
        if current_time > data["expires_ms"]:
            commitment_store.remove(request.commitment_hash)
            # Phase C: Log expiration to audit trail
            if audit_log:
                audit_log.append(
                    action=AuditAction.COMMIT_EXPIRED,
                    commitment_hash=request.commitment_hash,
                    details={"expired_at_ms": current_time},
                )
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
        
        # Phase C: Log reveal to audit trail
        if audit_log:
            audit_log.append(
                action=AuditAction.COMMIT_REVEALED,
                commitment_hash=request.commitment_hash,
                details={
                    "verified": verified,
                    "positions": data["positions"],
                    "reveal_time_ms": current_time,
                },
            )
        
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
        
        # Phase C: Log verification to audit trail
        if audit_log:
            audit_log.append(
                action=AuditAction.COMMIT_VERIFIED,
                commitment_hash=request.commitment_hash,
                details={
                    "valid": valid,
                    "commitment_matches": commitment_matches,
                    "timestamp_valid": timestamp_valid,
                },
            )
        
        return VerifyResponse(
            valid=valid,
            commitment_matches=commitment_matches,
            timestamp_valid=timestamp_valid,
            error=error,
        )
    
    # Phase C: Audit trail endpoints
    @app.get("/api/audit/summary")
    async def get_audit_summary():
        """
        Get comprehensive audit summary.
        
        Returns total entries, action counts, chain validity,
        and sequence gap detection results.
        """
        if not audit_log:
            raise HTTPException(
                status_code=503,
                detail="Audit log not available",
            )
        
        return audit_log.audit_summary()
    
    @app.get("/api/audit/commitment/{commitment_hash}")
    async def get_commitment_lifecycle(commitment_hash: str):
        """
        Get full lifecycle of a commitment.
        
        Returns all audit entries for a commitment, showing
        its complete history from creation to resolution.
        """
        if not audit_log:
            raise HTTPException(
                status_code=503,
                detail="Audit log not available",
            )
        
        return audit_log.get_commitment_lifecycle(commitment_hash)
    
    @app.get("/api/audit/recent")
    async def get_recent_audit_entries(limit: int = 100):
        """
        Get recent audit log entries.
        
        Args:
            limit: Maximum entries to return (default 100)
        """
        if not audit_log:
            raise HTTPException(
                status_code=503,
                detail="Audit log not available",
            )
        
        entries = audit_log.list_recent(limit=min(limit, 1000))
        return {"entries": [e.to_dict() for e in entries]}
    
    @app.get("/api/audit/gaps")
    async def detect_sequence_gaps():
        """
        Detect gaps in commitment sequence.
        
        Analyzes the audit log to find commitments that were created
        but never revealed or expired. This helps detect if an operator
        is selectively hiding unfavorable outcomes.
        """
        if not audit_log:
            raise HTTPException(
                status_code=503,
                detail="Audit log not available",
            )
        
        return audit_log.detect_sequence_gaps()
    
    @app.get("/api/audit/verify-chain")
    async def verify_audit_chain():
        """
        Verify hash chain integrity.
        
        Returns True if the audit log hash chain is intact,
        False if any tampering is detected.
        """
        if not audit_log:
            raise HTTPException(
                status_code=503,
                detail="Audit log not available",
            )
        
        chain_valid = audit_log.verify_chain()
        return {"chain_valid": chain_valid}
    
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
    app.state.audit_log = audit_log  # Phase C
    app.state.database = database  # Phase C
    
    return app

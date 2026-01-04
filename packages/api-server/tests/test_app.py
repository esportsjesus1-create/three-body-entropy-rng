"""Tests for FastAPI application."""

import pytest
from fastapi.testclient import TestClient
from api_server.app import create_app, CommitmentStore, compute_commitment_hash
from api_server.rate_limiter import RateLimitConfig


@pytest.fixture
def client():
    """Create test client."""
    app = create_app(
        rate_limit_config=RateLimitConfig(
            requests_per_second=100,
            burst_size=100,
        ),
        enable_audit_log=False,  # Disable audit log for basic tests
        min_commit_reveal_delay_ms=0,  # Disable timing check for basic tests
    )
    return TestClient(app)


@pytest.fixture
def strict_rate_limit_client():
    """Create test client with strict rate limiting."""
    app = create_app(
        rate_limit_config=RateLimitConfig(
            requests_per_second=1,
            burst_size=2,
        ),
        enable_audit_log=False,  # Disable audit log for basic tests
        min_commit_reveal_delay_ms=0,  # Disable timing check for basic tests
    )
    return TestClient(app)


class TestRootEndpoint:
    """Tests for root endpoint."""
    
    def test_root(self, client):
        """Test root endpoint."""
        response = client.get("/")
        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "Three-Body RNG API"
        assert data["version"] == "1.0.0"


class TestHealthEndpoints:
    """Tests for health endpoints."""
    
    def test_health(self, client):
        """Test health endpoint."""
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["state"] == "healthy"
        assert data["version"] == "1.0.0"
        assert "uptime_seconds" in data
    
    def test_healthz(self, client):
        """Test Kubernetes health endpoint."""
        response = client.get("/healthz")
        assert response.status_code == 200
        assert response.json()["status"] == "ok"


class TestCommitEndpoint:
    """Tests for commit endpoint."""
    
    def test_commit_basic(self, client):
        """Test basic commitment creation."""
        response = client.post("/commit", json={})
        assert response.status_code == 200
        data = response.json()
        
        assert "commitment_hash" in data
        assert len(data["commitment_hash"]) == 64
        assert "timestamp_ms" in data
        assert "nonce" in data
        assert "expires_ms" in data
    
    def test_commit_with_num_reels(self, client):
        """Test commitment with custom reel count."""
        response = client.post("/commit", json={"num_reels": 3})
        assert response.status_code == 200
    
    def test_commit_with_client_seed(self, client):
        """Test commitment with client seed."""
        response = client.post("/commit", json={"client_seed": "test123"})
        assert response.status_code == 200


class TestRevealEndpoint:
    """Tests for reveal endpoint."""
    
    def test_reveal_valid(self, client):
        """Test revealing valid commitment."""
        # Create commitment
        commit_response = client.post("/commit", json={})
        commitment_hash = commit_response.json()["commitment_hash"]
        
        # Reveal
        response = client.post("/reveal", json={
            "commitment_hash": commitment_hash,
        })
        assert response.status_code == 200
        data = response.json()
        
        assert data["commitment_hash"] == commitment_hash
        assert "server_seed" in data
        assert "entropy_hex" in data
        assert "positions" in data
        assert data["verified"] is True
    
    def test_reveal_not_found(self, client):
        """Test revealing non-existent commitment."""
        response = client.post("/reveal", json={
            "commitment_hash": "nonexistent",
        })
        assert response.status_code == 404
    
    def test_reveal_single_use(self, client):
        """Test commitment can only be revealed once."""
        # Create commitment
        commit_response = client.post("/commit", json={})
        commitment_hash = commit_response.json()["commitment_hash"]
        
        # First reveal
        response = client.post("/reveal", json={
            "commitment_hash": commitment_hash,
        })
        assert response.status_code == 200
        
        # Second reveal should fail
        response = client.post("/reveal", json={
            "commitment_hash": commitment_hash,
        })
        assert response.status_code == 404


class TestVerifyEndpoint:
    """Tests for verify endpoint."""
    
    def test_verify_valid(self, client):
        """Test verifying valid commitment."""
        # Create and reveal commitment
        commit_response = client.post("/commit", json={})
        commitment_hash = commit_response.json()["commitment_hash"]
        
        reveal_response = client.post("/reveal", json={
            "commitment_hash": commitment_hash,
        })
        reveal_data = reveal_response.json()
        
        # Verify
        response = client.post("/verify", json={
            "commitment_hash": commitment_hash,
            "server_seed": reveal_data["server_seed"],
            "entropy_hex": reveal_data["entropy_hex"],
            "nonce": reveal_data["nonce"],
            "timestamp_ms": reveal_data["timestamp_ms"],
            "positions": reveal_data["positions"],
        })
        assert response.status_code == 200
        data = response.json()
        
        assert data["valid"] is True
        assert data["commitment_matches"] is True
        assert data["timestamp_valid"] is True
    
    def test_verify_invalid_hash(self, client):
        """Test verifying with wrong hash."""
        response = client.post("/verify", json={
            "commitment_hash": "wrong_hash",
            "server_seed": "abc123",
            "entropy_hex": "def456",
            "nonce": 1,
            "timestamp_ms": 1000,
        })
        assert response.status_code == 200
        data = response.json()
        
        assert data["valid"] is False
        assert data["commitment_matches"] is False


class TestPublicKeyEndpoint:
    """Tests for public key endpoint."""
    
    def test_public_key(self, client):
        """Test getting public key."""
        response = client.get("/public-key")
        assert response.status_code == 200
        data = response.json()
        
        assert "public_key_pem" in data
        assert "algorithm" in data


class TestRateLimiting:
    """Tests for rate limiting."""
    
    def test_rate_limit_headers(self, client):
        """Test rate limit headers are present."""
        response = client.post("/commit", json={})
        assert "X-RateLimit-Remaining" in response.headers
    
    def test_rate_limit_exceeded(self, strict_rate_limit_client):
        """Test rate limit exceeded response."""
        client = strict_rate_limit_client
        
        # Exhaust burst
        for _ in range(2):
            client.post("/commit", json={})
        
        # Next request should be rate limited
        response = client.post("/commit", json={})
        assert response.status_code == 429
        data = response.json()
        
        assert data["error"] == "rate_limit_exceeded"
        assert "retry_after" in data
        assert "Retry-After" in response.headers
    
    def test_health_not_rate_limited(self, strict_rate_limit_client):
        """Test health endpoints bypass rate limiting."""
        client = strict_rate_limit_client
        
        # Exhaust burst on commit
        for _ in range(3):
            client.post("/commit", json={})
        
        # Health should still work
        response = client.get("/health")
        assert response.status_code == 200


class TestCommitmentStore:
    """Tests for CommitmentStore class."""
    
    def test_generate_nonce(self):
        """Test nonce generation."""
        store = CommitmentStore()
        nonce1 = store.generate_nonce()
        nonce2 = store.generate_nonce()
        assert nonce1 != nonce2
    
    def test_store_and_get(self):
        """Test storing and retrieving."""
        store = CommitmentStore()
        store.store("hash1", {"data": "test"})
        
        result = store.get("hash1")
        assert result == {"data": "test"}
    
    def test_get_nonexistent(self):
        """Test getting non-existent key."""
        store = CommitmentStore()
        assert store.get("nonexistent") is None
    
    def test_remove(self):
        """Test removing commitment."""
        store = CommitmentStore()
        store.store("hash1", {"data": "test"})
        store.remove("hash1")
        
        assert store.get("hash1") is None


class TestComputeCommitmentHash:
    """Tests for compute_commitment_hash function."""
    
    def test_returns_64_chars(self):
        """Test hash is 64 characters."""
        h = compute_commitment_hash(
            server_seed="abc",
            entropy_hex="def",
            nonce=1,
            timestamp_ms=1000,
            positions=[1, 2, 3],
        )
        assert len(h) == 64
    
    def test_deterministic(self):
        """Test hash is deterministic."""
        h1 = compute_commitment_hash("abc", "def", 1, 1000, [1, 2, 3])
        h2 = compute_commitment_hash("abc", "def", 1, 1000, [1, 2, 3])
        assert h1 == h2
    
    def test_different_inputs_different_hash(self):
        """Test different inputs produce different hash."""
        h1 = compute_commitment_hash("abc", "def", 1, 1000, [1, 2, 3])
        h2 = compute_commitment_hash("xyz", "def", 1, 1000, [1, 2, 3])
        assert h1 != h2


class TestAuditEndpoints:
    """Tests for Phase C audit trail endpoints."""
    
    @pytest.fixture
    def audit_client(self):
        """Create test client with audit logging enabled."""
        # Use shared cache for in-memory SQLite to work across threads
        app = create_app(
            rate_limit_config=RateLimitConfig(
                requests_per_second=100,
                burst_size=100,
            ),
            db_path="file::memory:?cache=shared",
            enable_audit_log=True,
        )
        return TestClient(app)
    
    def test_audit_summary(self, audit_client):
        """Test audit summary endpoint."""
        # Create some commitments to populate audit log
        for _ in range(3):
            audit_client.post("/commit", json={})
        
        response = audit_client.get("/api/audit/summary")
        assert response.status_code == 200
        data = response.json()
        
        assert "total_entries" in data
        assert "action_counts" in data
        assert "chain_valid" in data
        assert data["total_entries"] >= 3
    
    def test_audit_commitment_lifecycle(self, audit_client):
        """Test commitment lifecycle endpoint."""
        # Create and reveal a commitment
        commit_response = audit_client.post("/commit", json={})
        commitment_hash = commit_response.json()["commitment_hash"]
        
        audit_client.post("/reveal", json={
            "commitment_hash": commitment_hash,
        })
        
        # Get lifecycle
        response = audit_client.get(f"/api/audit/commitment/{commitment_hash}")
        assert response.status_code == 200
        data = response.json()
        
        assert "entries" in data
        assert len(data["entries"]) >= 2  # At least commit + reveal
    
    def test_audit_recent_entries(self, audit_client):
        """Test recent audit entries endpoint."""
        # Create some commitments
        for _ in range(5):
            audit_client.post("/commit", json={})
        
        response = audit_client.get("/api/audit/recent?limit=10")
        assert response.status_code == 200
        data = response.json()
        
        assert "entries" in data
        assert len(data["entries"]) >= 5
    
    def test_audit_gaps_detection(self, audit_client):
        """Test sequence gap detection endpoint."""
        # Create some commitments
        for _ in range(3):
            audit_client.post("/commit", json={})
        
        response = audit_client.get("/api/audit/gaps")
        assert response.status_code == 200
        data = response.json()
        
        # API returns gap_detected, missing_count, missing_hashes, etc.
        assert "gap_detected" in data
        assert "missing_count" in data
    
    def test_audit_verify_chain(self, audit_client):
        """Test hash chain verification endpoint."""
        # Create some commitments
        for _ in range(3):
            audit_client.post("/commit", json={})
        
        response = audit_client.get("/api/audit/verify-chain")
        assert response.status_code == 200
        data = response.json()
        
        assert "chain_valid" in data
        assert data["chain_valid"] is True
    
    def test_audit_endpoints_unavailable_when_disabled(self, client):
        """Test audit endpoints return 503 when audit log is disabled."""
        response = client.get("/api/audit/summary")
        assert response.status_code == 503
        
        response = client.get("/api/audit/commitment/test")
        assert response.status_code == 503
        
        response = client.get("/api/audit/recent")
        assert response.status_code == 503
        
        response = client.get("/api/audit/gaps")
        assert response.status_code == 503
        
        response = client.get("/api/audit/verify-chain")
        assert response.status_code == 503

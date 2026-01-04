"""Tests for rate limiter."""

import pytest
import time
import threading
from api_server.rate_limiter import (
    RateLimiter,
    RateLimitConfig,
    RateLimitExceeded,
    TokenBucket,
)


class TestTokenBucket:
    """Tests for TokenBucket class."""
    
    def test_consume_with_tokens(self):
        """Test consuming when tokens available."""
        bucket = TokenBucket(
            tokens=10,
            last_update=time.time(),
            capacity=10,
            rate=1.0,
        )
        assert bucket.consume(time.time()) is True
        assert bucket.tokens == 9
    
    def test_consume_without_tokens(self):
        """Test consuming when no tokens."""
        bucket = TokenBucket(
            tokens=0,
            last_update=time.time(),
            capacity=10,
            rate=1.0,
        )
        assert bucket.consume(time.time()) is False
    
    def test_token_refill(self):
        """Test tokens refill over time."""
        current_time = time.time()
        bucket = TokenBucket(
            tokens=0,
            last_update=current_time - 5,  # 5 seconds ago
            capacity=10,
            rate=1.0,
        )
        # Should have 5 tokens after 5 seconds
        assert bucket.consume(current_time) is True
        assert bucket.tokens >= 4  # At least 4 remaining
    
    def test_capacity_limit(self):
        """Test tokens don't exceed capacity."""
        current_time = time.time()
        bucket = TokenBucket(
            tokens=5,
            last_update=current_time - 100,  # Long time ago
            capacity=10,
            rate=1.0,
        )
        bucket.consume(current_time)
        assert bucket.tokens <= 10
    
    def test_time_until_available(self):
        """Test time until token available."""
        bucket = TokenBucket(
            tokens=0.5,
            last_update=time.time(),
            capacity=10,
            rate=1.0,
        )
        wait_time = bucket.time_until_available()
        assert wait_time == pytest.approx(0.5, abs=0.1)
    
    def test_time_until_available_with_tokens(self):
        """Test time is 0 when tokens available."""
        bucket = TokenBucket(
            tokens=5,
            last_update=time.time(),
            capacity=10,
            rate=1.0,
        )
        assert bucket.time_until_available() == 0


class TestRateLimitConfig:
    """Tests for RateLimitConfig class."""
    
    def test_defaults(self):
        """Test default configuration."""
        config = RateLimitConfig()
        assert config.requests_per_second == 10.0
        assert config.burst_size == 20
        assert config.cleanup_interval == 60.0
    
    def test_custom_config(self):
        """Test custom configuration."""
        config = RateLimitConfig(
            requests_per_second=5.0,
            burst_size=10,
            cleanup_interval=30.0,
        )
        assert config.requests_per_second == 5.0
        assert config.burst_size == 10


class TestRateLimiter:
    """Tests for RateLimiter class."""
    
    def test_allows_initial_requests(self):
        """Test initial requests are allowed."""
        limiter = RateLimiter(RateLimitConfig(burst_size=5))
        
        for _ in range(5):
            limiter.check("client1")  # Should not raise
    
    def test_blocks_after_burst(self):
        """Test blocks after burst exhausted."""
        limiter = RateLimiter(RateLimitConfig(
            requests_per_second=1.0,
            burst_size=3,
        ))
        
        # Exhaust burst
        for _ in range(3):
            limiter.check("client1")
        
        # Next request should be blocked
        with pytest.raises(RateLimitExceeded):
            limiter.check("client1")
    
    def test_different_clients_independent(self):
        """Test different clients have independent limits."""
        limiter = RateLimiter(RateLimitConfig(burst_size=2))
        
        limiter.check("client1")
        limiter.check("client1")
        
        # client2 should still have full burst
        limiter.check("client2")
        limiter.check("client2")
    
    def test_retry_after(self):
        """Test retry_after is set correctly."""
        limiter = RateLimiter(RateLimitConfig(
            requests_per_second=1.0,
            burst_size=1,
        ))
        
        limiter.check("client1")
        
        try:
            limiter.check("client1")
            assert False, "Should have raised"
        except RateLimitExceeded as e:
            assert e.retry_after > 0
            assert e.retry_after <= 1.0
    
    def test_get_remaining(self):
        """Test getting remaining requests."""
        limiter = RateLimiter(RateLimitConfig(burst_size=10))
        
        assert limiter.get_remaining("client1") == 10
        
        limiter.check("client1")
        assert limiter.get_remaining("client1") == 9
    
    def test_reset_client(self):
        """Test resetting client limit."""
        limiter = RateLimiter(RateLimitConfig(burst_size=2))
        
        limiter.check("client1")
        limiter.check("client1")
        
        with pytest.raises(RateLimitExceeded):
            limiter.check("client1")
        
        limiter.reset("client1")
        limiter.check("client1")  # Should work now
    
    def test_reset_all(self):
        """Test resetting all limits."""
        limiter = RateLimiter(RateLimitConfig(burst_size=1))
        
        limiter.check("client1")
        limiter.check("client2")
        
        limiter.reset_all()
        
        limiter.check("client1")  # Should work
        limiter.check("client2")  # Should work
    
    def test_thread_safety(self):
        """Test thread-safe operations."""
        limiter = RateLimiter(RateLimitConfig(
            requests_per_second=1000,
            burst_size=100,
        ))
        
        errors = []
        
        def worker():
            try:
                for _ in range(10):
                    limiter.check("client1")
            except RateLimitExceeded:
                pass  # Expected after burst
            except Exception as e:
                errors.append(e)
        
        threads = [threading.Thread(target=worker) for _ in range(10)]
        for t in threads:
            t.start()
        for t in threads:
            t.join()
        
        assert len(errors) == 0


class TestRateLimitExceeded:
    """Tests for RateLimitExceeded exception."""
    
    def test_retry_after(self):
        """Test retry_after attribute."""
        exc = RateLimitExceeded(1.5)
        assert exc.retry_after == 1.5
    
    def test_message(self):
        """Test exception message."""
        exc = RateLimitExceeded(1.5)
        assert "1.5" in str(exc)

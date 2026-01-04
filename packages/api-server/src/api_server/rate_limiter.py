"""
Rate limiting middleware for API protection.

Provides per-IP rate limiting to prevent abuse and DoS attacks.
"""

import time
import threading
from dataclasses import dataclass, field
from typing import Dict, Optional
from collections import defaultdict


class RateLimitExceeded(Exception):
    """Raised when rate limit is exceeded."""
    
    def __init__(self, retry_after: float):
        self.retry_after = retry_after
        super().__init__(f"Rate limit exceeded. Retry after {retry_after:.1f}s")


@dataclass
class RateLimitConfig:
    """
    Rate limit configuration.
    
    Attributes:
        requests_per_second: Maximum requests per second per IP
        burst_size: Maximum burst size (token bucket capacity)
        cleanup_interval: Seconds between cleanup of old entries
    """
    requests_per_second: float = 10.0
    burst_size: int = 20
    cleanup_interval: float = 60.0


@dataclass
class TokenBucket:
    """
    Token bucket for rate limiting.
    
    Attributes:
        tokens: Current number of tokens
        last_update: Last time tokens were updated
        capacity: Maximum tokens (burst size)
        rate: Tokens added per second
    """
    tokens: float
    last_update: float
    capacity: int
    rate: float
    
    def consume(self, current_time: float) -> bool:
        """
        Try to consume a token.
        
        Args:
            current_time: Current timestamp
            
        Returns:
            True if token consumed, False if rate limited
        """
        # Add tokens based on time elapsed
        elapsed = current_time - self.last_update
        self.tokens = min(self.capacity, self.tokens + elapsed * self.rate)
        self.last_update = current_time
        
        if self.tokens >= 1:
            self.tokens -= 1
            return True
        return False
    
    def time_until_available(self) -> float:
        """Get seconds until a token is available."""
        if self.tokens >= 1:
            return 0
        return (1 - self.tokens) / self.rate


class RateLimiter:
    """
    Thread-safe rate limiter using token bucket algorithm.
    
    Example:
        >>> limiter = RateLimiter(RateLimitConfig(requests_per_second=10))
        >>> try:
        ...     limiter.check("192.168.1.1")
        ... except RateLimitExceeded as e:
        ...     print(f"Rate limited, retry after {e.retry_after}s")
    """
    
    def __init__(self, config: Optional[RateLimitConfig] = None):
        """
        Initialize rate limiter.
        
        Args:
            config: Rate limit configuration
        """
        self.config = config or RateLimitConfig()
        self._buckets: Dict[str, TokenBucket] = {}
        self._lock = threading.Lock()
        self._last_cleanup = time.time()
    
    def check(self, client_id: str) -> None:
        """
        Check if request is allowed.
        
        Args:
            client_id: Client identifier (usually IP address)
            
        Raises:
            RateLimitExceeded: If rate limit exceeded
        """
        current_time = time.time()
        
        with self._lock:
            # Cleanup old entries periodically
            if current_time - self._last_cleanup > self.config.cleanup_interval:
                self._cleanup(current_time)
            
            # Get or create bucket for client
            if client_id not in self._buckets:
                self._buckets[client_id] = TokenBucket(
                    tokens=self.config.burst_size,
                    last_update=current_time,
                    capacity=self.config.burst_size,
                    rate=self.config.requests_per_second,
                )
            
            bucket = self._buckets[client_id]
            
            if not bucket.consume(current_time):
                raise RateLimitExceeded(bucket.time_until_available())
    
    def _cleanup(self, current_time: float) -> None:
        """Remove stale buckets."""
        stale_threshold = current_time - self.config.cleanup_interval * 2
        stale_keys = [
            k for k, v in self._buckets.items()
            if v.last_update < stale_threshold
        ]
        for key in stale_keys:
            del self._buckets[key]
        self._last_cleanup = current_time
    
    def get_remaining(self, client_id: str) -> int:
        """
        Get remaining requests for client.
        
        Args:
            client_id: Client identifier
            
        Returns:
            Number of remaining requests
        """
        with self._lock:
            if client_id not in self._buckets:
                return self.config.burst_size
            
            bucket = self._buckets[client_id]
            # Update tokens based on elapsed time
            current_time = time.time()
            elapsed = current_time - bucket.last_update
            tokens = min(bucket.capacity, bucket.tokens + elapsed * bucket.rate)
            return int(tokens)
    
    def reset(self, client_id: str) -> None:
        """
        Reset rate limit for a client.
        
        Args:
            client_id: Client identifier
        """
        with self._lock:
            if client_id in self._buckets:
                del self._buckets[client_id]
    
    def reset_all(self) -> None:
        """Reset all rate limits."""
        with self._lock:
            self._buckets.clear()

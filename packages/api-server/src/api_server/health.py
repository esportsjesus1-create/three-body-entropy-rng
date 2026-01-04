"""
Health check endpoints and status.

Provides health status for monitoring and load balancing.
"""

import time
from dataclasses import dataclass, field
from typing import Dict, Any, Optional
from enum import Enum


class HealthState(str, Enum):
    """Health state enumeration."""
    HEALTHY = "healthy"
    DEGRADED = "degraded"
    UNHEALTHY = "unhealthy"


@dataclass
class ComponentHealth:
    """
    Health status of a component.
    
    Attributes:
        name: Component name
        state: Health state
        message: Optional status message
        latency_ms: Optional latency in milliseconds
    """
    name: str
    state: HealthState
    message: Optional[str] = None
    latency_ms: Optional[float] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        d = {
            "name": self.name,
            "state": self.state.value,
        }
        if self.message:
            d["message"] = self.message
        if self.latency_ms is not None:
            d["latency_ms"] = self.latency_ms
        return d


@dataclass
class HealthStatus:
    """
    Overall health status.
    
    Attributes:
        state: Overall health state
        version: API version
        uptime_seconds: Server uptime
        components: Individual component health
        timestamp_ms: Status timestamp
    """
    state: HealthState
    version: str
    uptime_seconds: float
    components: Dict[str, ComponentHealth] = field(default_factory=dict)
    timestamp_ms: int = field(default_factory=lambda: int(time.time() * 1000))
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            "state": self.state.value,
            "version": self.version,
            "uptime_seconds": round(self.uptime_seconds, 2),
            "components": {k: v.to_dict() for k, v in self.components.items()},
            "timestamp_ms": self.timestamp_ms,
        }


class HealthChecker:
    """
    Health checker for API server.
    
    Tracks component health and provides overall status.
    """
    
    def __init__(self, version: str = "1.0.0"):
        """
        Initialize health checker.
        
        Args:
            version: API version string
        """
        self.version = version
        self._start_time = time.time()
        self._components: Dict[str, ComponentHealth] = {}
    
    def register_component(self, name: str) -> None:
        """
        Register a component for health tracking.
        
        Args:
            name: Component name
        """
        self._components[name] = ComponentHealth(
            name=name,
            state=HealthState.HEALTHY,
        )
    
    def update_component(
        self,
        name: str,
        state: HealthState,
        message: Optional[str] = None,
        latency_ms: Optional[float] = None,
    ) -> None:
        """
        Update component health status.
        
        Args:
            name: Component name
            state: New health state
            message: Optional status message
            latency_ms: Optional latency measurement
        """
        self._components[name] = ComponentHealth(
            name=name,
            state=state,
            message=message,
            latency_ms=latency_ms,
        )
    
    def get_status(self) -> HealthStatus:
        """
        Get overall health status.
        
        Returns:
            HealthStatus with overall and component health
        """
        uptime = time.time() - self._start_time
        
        # Determine overall state from components
        if not self._components:
            overall_state = HealthState.HEALTHY
        elif any(c.state == HealthState.UNHEALTHY for c in self._components.values()):
            overall_state = HealthState.UNHEALTHY
        elif any(c.state == HealthState.DEGRADED for c in self._components.values()):
            overall_state = HealthState.DEGRADED
        else:
            overall_state = HealthState.HEALTHY
        
        return HealthStatus(
            state=overall_state,
            version=self.version,
            uptime_seconds=uptime,
            components=self._components.copy(),
        )
    
    def is_healthy(self) -> bool:
        """Check if server is healthy."""
        status = self.get_status()
        return status.state != HealthState.UNHEALTHY


# Global health checker instance
_health_checker: Optional[HealthChecker] = None


def init_health_checker(version: str = "1.0.0") -> HealthChecker:
    """
    Initialize global health checker.
    
    Args:
        version: API version
        
    Returns:
        HealthChecker instance
    """
    global _health_checker
    _health_checker = HealthChecker(version)
    return _health_checker


def get_health_checker() -> HealthChecker:
    """
    Get global health checker.
    
    Returns:
        HealthChecker instance
        
    Raises:
        RuntimeError: If not initialized
    """
    if _health_checker is None:
        raise RuntimeError("Health checker not initialized")
    return _health_checker


def get_health_status() -> HealthStatus:
    """
    Get current health status.
    
    Returns:
        Current HealthStatus
    """
    return get_health_checker().get_status()

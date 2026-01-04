"""Tests for health checks."""

import pytest
import time
from api_server.health import (
    HealthState,
    ComponentHealth,
    HealthStatus,
    HealthChecker,
    init_health_checker,
    get_health_checker,
    get_health_status,
)


class TestHealthState:
    """Tests for HealthState enum."""
    
    def test_values(self):
        """Test enum values."""
        assert HealthState.HEALTHY.value == "healthy"
        assert HealthState.DEGRADED.value == "degraded"
        assert HealthState.UNHEALTHY.value == "unhealthy"


class TestComponentHealth:
    """Tests for ComponentHealth class."""
    
    def test_creation(self):
        """Test basic creation."""
        health = ComponentHealth(
            name="test",
            state=HealthState.HEALTHY,
        )
        assert health.name == "test"
        assert health.state == HealthState.HEALTHY
    
    def test_with_optional_fields(self):
        """Test creation with optional fields."""
        health = ComponentHealth(
            name="test",
            state=HealthState.DEGRADED,
            message="High latency",
            latency_ms=150.5,
        )
        assert health.message == "High latency"
        assert health.latency_ms == 150.5
    
    def test_to_dict(self):
        """Test conversion to dictionary."""
        health = ComponentHealth(
            name="test",
            state=HealthState.HEALTHY,
            message="OK",
        )
        d = health.to_dict()
        assert d["name"] == "test"
        assert d["state"] == "healthy"
        assert d["message"] == "OK"


class TestHealthStatus:
    """Tests for HealthStatus class."""
    
    def test_creation(self):
        """Test basic creation."""
        status = HealthStatus(
            state=HealthState.HEALTHY,
            version="1.0.0",
            uptime_seconds=100.5,
        )
        assert status.state == HealthState.HEALTHY
        assert status.version == "1.0.0"
        assert status.uptime_seconds == 100.5
    
    def test_with_components(self):
        """Test creation with components."""
        component = ComponentHealth(name="db", state=HealthState.HEALTHY)
        status = HealthStatus(
            state=HealthState.HEALTHY,
            version="1.0.0",
            uptime_seconds=100,
            components={"db": component},
        )
        assert "db" in status.components
    
    def test_to_dict(self):
        """Test conversion to dictionary."""
        status = HealthStatus(
            state=HealthState.HEALTHY,
            version="1.0.0",
            uptime_seconds=100.123,
        )
        d = status.to_dict()
        assert d["state"] == "healthy"
        assert d["version"] == "1.0.0"
        assert d["uptime_seconds"] == 100.12


class TestHealthChecker:
    """Tests for HealthChecker class."""
    
    def test_creation(self):
        """Test basic creation."""
        checker = HealthChecker("1.0.0")
        assert checker.version == "1.0.0"
    
    def test_register_component(self):
        """Test registering component."""
        checker = HealthChecker()
        checker.register_component("db")
        
        status = checker.get_status()
        assert "db" in status.components
        assert status.components["db"].state == HealthState.HEALTHY
    
    def test_update_component(self):
        """Test updating component health."""
        checker = HealthChecker()
        checker.register_component("db")
        checker.update_component("db", HealthState.DEGRADED, "Slow queries")
        
        status = checker.get_status()
        assert status.components["db"].state == HealthState.DEGRADED
        assert status.components["db"].message == "Slow queries"
    
    def test_overall_state_healthy(self):
        """Test overall state when all healthy."""
        checker = HealthChecker()
        checker.register_component("db")
        checker.register_component("cache")
        
        status = checker.get_status()
        assert status.state == HealthState.HEALTHY
    
    def test_overall_state_degraded(self):
        """Test overall state when one degraded."""
        checker = HealthChecker()
        checker.register_component("db")
        checker.register_component("cache")
        checker.update_component("cache", HealthState.DEGRADED)
        
        status = checker.get_status()
        assert status.state == HealthState.DEGRADED
    
    def test_overall_state_unhealthy(self):
        """Test overall state when one unhealthy."""
        checker = HealthChecker()
        checker.register_component("db")
        checker.update_component("db", HealthState.UNHEALTHY)
        
        status = checker.get_status()
        assert status.state == HealthState.UNHEALTHY
    
    def test_is_healthy(self):
        """Test is_healthy method."""
        checker = HealthChecker()
        assert checker.is_healthy() is True
        
        checker.register_component("db")
        checker.update_component("db", HealthState.UNHEALTHY)
        assert checker.is_healthy() is False
    
    def test_uptime(self):
        """Test uptime tracking."""
        checker = HealthChecker()
        time.sleep(0.1)
        
        status = checker.get_status()
        assert status.uptime_seconds >= 0.1


class TestGlobalHealthChecker:
    """Tests for global health checker functions."""
    
    def test_init_and_get(self):
        """Test initializing and getting global checker."""
        checker = init_health_checker("2.0.0")
        assert checker.version == "2.0.0"
        
        retrieved = get_health_checker()
        assert retrieved is checker
    
    def test_get_health_status(self):
        """Test getting health status."""
        init_health_checker("1.0.0")
        status = get_health_status()
        assert status.version == "1.0.0"

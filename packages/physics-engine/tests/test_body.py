"""Tests for Body class."""

import pytest
from physics_engine.body import Body


class TestBody:
    """Tests for Body dataclass."""
    
    def test_creation(self):
        """Test body creation."""
        body = Body(x=1.0, y=2.0, vx=0.5, vy=-0.5, mass=1.0)
        assert body.x == 1.0
        assert body.y == 2.0
        assert body.vx == 0.5
        assert body.vy == -0.5
        assert body.mass == 1.0
    
    def test_default_mass(self):
        """Test default mass is 1.0."""
        body = Body(x=0, y=0, vx=0, vy=0)
        assert body.mass == 1.0
    
    def test_immutable(self):
        """Test body is immutable."""
        body = Body(x=1.0, y=2.0, vx=0.5, vy=-0.5)
        with pytest.raises(AttributeError):
            body.x = 5.0
    
    def test_with_position(self):
        """Test creating body with new position."""
        body = Body(x=1.0, y=2.0, vx=0.5, vy=-0.5)
        new_body = body.with_position(3.0, 4.0)
        
        assert new_body.x == 3.0
        assert new_body.y == 4.0
        assert new_body.vx == 0.5
        assert new_body.vy == -0.5
        assert body.x == 1.0  # Original unchanged
    
    def test_with_velocity(self):
        """Test creating body with new velocity."""
        body = Body(x=1.0, y=2.0, vx=0.5, vy=-0.5)
        new_body = body.with_velocity(1.5, -1.5)
        
        assert new_body.x == 1.0
        assert new_body.y == 2.0
        assert new_body.vx == 1.5
        assert new_body.vy == -1.5
    
    def test_with_state(self):
        """Test creating body with new state."""
        body = Body(x=1.0, y=2.0, vx=0.5, vy=-0.5)
        new_body = body.with_state(3.0, 4.0, 1.5, -1.5)
        
        assert new_body.x == 3.0
        assert new_body.y == 4.0
        assert new_body.vx == 1.5
        assert new_body.vy == -1.5
    
    def test_position_property(self):
        """Test position property."""
        body = Body(x=1.0, y=2.0, vx=0.5, vy=-0.5)
        assert body.position == (1.0, 2.0)
    
    def test_velocity_property(self):
        """Test velocity property."""
        body = Body(x=1.0, y=2.0, vx=0.5, vy=-0.5)
        assert body.velocity == (0.5, -0.5)
    
    def test_to_dict(self):
        """Test conversion to dictionary."""
        body = Body(x=1.0, y=2.0, vx=0.5, vy=-0.5, mass=2.0)
        d = body.to_dict()
        
        assert d["x"] == 1.0
        assert d["y"] == 2.0
        assert d["vx"] == 0.5
        assert d["vy"] == -0.5
        assert d["mass"] == 2.0
    
    def test_from_dict(self):
        """Test creation from dictionary."""
        d = {"x": 1.0, "y": 2.0, "vx": 0.5, "vy": -0.5, "mass": 2.0}
        body = Body.from_dict(d)
        
        assert body.x == 1.0
        assert body.y == 2.0
        assert body.vx == 0.5
        assert body.vy == -0.5
        assert body.mass == 2.0
    
    def test_from_dict_default_mass(self):
        """Test creation from dict without mass."""
        d = {"x": 1.0, "y": 2.0, "vx": 0.5, "vy": -0.5}
        body = Body.from_dict(d)
        assert body.mass == 1.0
    
    def test_serialize_deserialize(self):
        """Test serialization roundtrip."""
        body = Body(x=1.234567890123, y=-2.345678901234, vx=0.5, vy=-0.5, mass=1.5)
        serialized = body.serialize()
        restored = Body.deserialize(serialized)
        
        # Should be equal within precision
        assert abs(restored.x - body.x) < 1e-9
        assert abs(restored.y - body.y) < 1e-9
        assert abs(restored.vx - body.vx) < 1e-9
        assert abs(restored.vy - body.vy) < 1e-9
        assert abs(restored.mass - body.mass) < 1e-9
    
    def test_serialize_deterministic(self):
        """Test serialization is deterministic."""
        body = Body(x=1.0, y=2.0, vx=0.5, vy=-0.5)
        s1 = body.serialize()
        s2 = body.serialize()
        assert s1 == s2
    
    def test_serialize_different_bodies(self):
        """Test different bodies serialize differently."""
        body1 = Body(x=1.0, y=2.0, vx=0.5, vy=-0.5)
        body2 = Body(x=1.0, y=2.0, vx=0.5, vy=-0.6)
        assert body1.serialize() != body2.serialize()

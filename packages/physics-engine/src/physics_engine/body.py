"""
Body representation for three-body simulation.

Provides immutable body state with position, velocity, and mass.
"""

from dataclasses import dataclass
from typing import Tuple
import struct


@dataclass(frozen=True)
class Body:
    """
    Represents a body in the three-body system.
    
    This is an immutable dataclass to ensure simulation state
    is not accidentally modified during integration.
    
    Attributes:
        x: X position
        y: Y position
        vx: X velocity
        vy: Y velocity
        mass: Body mass (default 1.0)
    """
    x: float
    y: float
    vx: float
    vy: float
    mass: float = 1.0
    
    def with_position(self, x: float, y: float) -> "Body":
        """Create new body with updated position."""
        return Body(x, y, self.vx, self.vy, self.mass)
    
    def with_velocity(self, vx: float, vy: float) -> "Body":
        """Create new body with updated velocity."""
        return Body(self.x, self.y, vx, vy, self.mass)
    
    def with_state(self, x: float, y: float, vx: float, vy: float) -> "Body":
        """Create new body with updated position and velocity."""
        return Body(x, y, vx, vy, self.mass)
    
    @property
    def position(self) -> Tuple[float, float]:
        """Get position as tuple."""
        return (self.x, self.y)
    
    @property
    def velocity(self) -> Tuple[float, float]:
        """Get velocity as tuple."""
        return (self.vx, self.vy)
    
    def to_dict(self) -> dict:
        """Convert to dictionary for JSON serialization."""
        return {
            "x": self.x,
            "y": self.y,
            "vx": self.vx,
            "vy": self.vy,
            "mass": self.mass,
        }
    
    @classmethod
    def from_dict(cls, d: dict) -> "Body":
        """Create body from dictionary."""
        return cls(
            x=d["x"],
            y=d["y"],
            vx=d["vx"],
            vy=d["vy"],
            mass=d.get("mass", 1.0),
        )
    
    def serialize(self, precision: int = 10) -> bytes:
        """
        Serialize body state to bytes with fixed precision.
        
        This ensures cross-platform reproducibility by quantizing
        floating-point values to a fixed number of decimal places.
        
        Args:
            precision: Number of decimal places to preserve (default 10)
            
        Returns:
            Serialized bytes representation
        """
        # Quantize to fixed precision to avoid floating-point drift
        scale = 10 ** precision
        qx = round(self.x * scale)
        qy = round(self.y * scale)
        qvx = round(self.vx * scale)
        qvy = round(self.vy * scale)
        qmass = round(self.mass * scale)
        
        # Pack as signed 64-bit integers
        return struct.pack(">qqqqq", qx, qy, qvx, qvy, qmass)
    
    @classmethod
    def deserialize(cls, data: bytes, precision: int = 10) -> "Body":
        """
        Deserialize body state from bytes.
        
        Args:
            data: Serialized bytes from serialize()
            precision: Precision used during serialization
            
        Returns:
            Reconstructed Body instance
        """
        scale = 10 ** precision
        qx, qy, qvx, qvy, qmass = struct.unpack(">qqqqq", data)
        return cls(
            x=qx / scale,
            y=qy / scale,
            vx=qvx / scale,
            vy=qvy / scale,
            mass=qmass / scale,
        )

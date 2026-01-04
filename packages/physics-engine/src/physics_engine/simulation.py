"""
Three-body physics simulation using RK4 integration.

Provides deterministic simulation of three gravitationally interacting
bodies using 4th-order Runge-Kutta numerical integration.
"""

import math
from dataclasses import dataclass
from typing import List, Tuple, Optional

from .body import Body


@dataclass
class SimulationParams:
    """
    Parameters for the three-body simulation.
    
    Attributes:
        dt: Time step for integration (smaller = more accurate)
        steps: Number of integration steps to perform
        G: Gravitational constant
        softening: Softening parameter to prevent singularities
    """
    dt: float = 0.001
    steps: int = 10000
    G: float = 1.0
    softening: float = 0.01
    
    def to_dict(self) -> dict:
        """Convert to dictionary for JSON serialization."""
        return {
            "dt": self.dt,
            "steps": self.steps,
            "G": self.G,
            "softening": self.softening,
        }


class ThreeBodySimulator:
    """
    Three-body gravitational simulation using RK4 integration.
    
    This simulator computes the gravitational interactions between
    three bodies using 4th-order Runge-Kutta integration, which
    provides good accuracy and stability.
    
    The chaotic nature of the three-body problem makes the final
    state highly sensitive to initial conditions, providing a
    source of entropy when seeded with random initial perturbations.
    
    Example:
        >>> params = SimulationParams(dt=0.001, steps=5000)
        >>> simulator = ThreeBodySimulator(params)
        >>> initial = ThreeBodySimulator.figure_8_initial_conditions()
        >>> final = simulator.simulate(initial)
        >>> len(final)
        3
    """
    
    def __init__(self, params: Optional[SimulationParams] = None):
        """
        Initialize simulator with parameters.
        
        Args:
            params: Simulation parameters. Uses defaults if None.
        """
        self.params = params or SimulationParams()
    
    def _compute_accelerations(
        self,
        bodies: List[Body],
        G: float,
        softening: float,
    ) -> List[Tuple[float, float]]:
        """
        Compute gravitational accelerations for all bodies.
        
        Args:
            bodies: List of three bodies
            G: Gravitational constant
            softening: Softening parameter
            
        Returns:
            List of (ax, ay) acceleration tuples
        """
        n = len(bodies)
        accelerations = [(0.0, 0.0) for _ in range(n)]
        
        for i in range(n):
            ax, ay = 0.0, 0.0
            for j in range(n):
                if i != j:
                    dx = bodies[j].x - bodies[i].x
                    dy = bodies[j].y - bodies[i].y
                    
                    # Distance with softening to prevent singularities
                    r_sq = dx * dx + dy * dy + softening * softening
                    r = math.sqrt(r_sq)
                    r_cubed = r_sq * r
                    
                    # Gravitational acceleration
                    ax += G * bodies[j].mass * dx / r_cubed
                    ay += G * bodies[j].mass * dy / r_cubed
            
            accelerations[i] = (ax, ay)
        
        return accelerations
    
    def _rk4_step(
        self,
        bodies: List[Body],
        dt: float,
        G: float,
        softening: float,
    ) -> List[Body]:
        """
        Perform one RK4 integration step.
        
        The RK4 method computes four estimates of the derivative
        and combines them for 4th-order accuracy:
        
        k1 = f(t, y)
        k2 = f(t + dt/2, y + dt*k1/2)
        k3 = f(t + dt/2, y + dt*k2/2)
        k4 = f(t + dt, y + dt*k3)
        y_new = y + (dt/6)(k1 + 2*k2 + 2*k3 + k4)
        
        Args:
            bodies: Current body states
            dt: Time step
            G: Gravitational constant
            softening: Softening parameter
            
        Returns:
            New body states after one step
        """
        n = len(bodies)
        
        # k1: derivatives at current state
        acc1 = self._compute_accelerations(bodies, G, softening)
        k1_pos = [(b.vx, b.vy) for b in bodies]
        k1_vel = acc1
        
        # k2: derivatives at midpoint using k1
        bodies_k2 = [
            Body(
                bodies[i].x + 0.5 * dt * k1_pos[i][0],
                bodies[i].y + 0.5 * dt * k1_pos[i][1],
                bodies[i].vx + 0.5 * dt * k1_vel[i][0],
                bodies[i].vy + 0.5 * dt * k1_vel[i][1],
                bodies[i].mass,
            )
            for i in range(n)
        ]
        acc2 = self._compute_accelerations(bodies_k2, G, softening)
        k2_pos = [(b.vx, b.vy) for b in bodies_k2]
        k2_vel = acc2
        
        # k3: derivatives at midpoint using k2
        bodies_k3 = [
            Body(
                bodies[i].x + 0.5 * dt * k2_pos[i][0],
                bodies[i].y + 0.5 * dt * k2_pos[i][1],
                bodies[i].vx + 0.5 * dt * k2_vel[i][0],
                bodies[i].vy + 0.5 * dt * k2_vel[i][1],
                bodies[i].mass,
            )
            for i in range(n)
        ]
        acc3 = self._compute_accelerations(bodies_k3, G, softening)
        k3_pos = [(b.vx, b.vy) for b in bodies_k3]
        k3_vel = acc3
        
        # k4: derivatives at endpoint using k3
        bodies_k4 = [
            Body(
                bodies[i].x + dt * k3_pos[i][0],
                bodies[i].y + dt * k3_pos[i][1],
                bodies[i].vx + dt * k3_vel[i][0],
                bodies[i].vy + dt * k3_vel[i][1],
                bodies[i].mass,
            )
            for i in range(n)
        ]
        acc4 = self._compute_accelerations(bodies_k4, G, softening)
        k4_pos = [(b.vx, b.vy) for b in bodies_k4]
        k4_vel = acc4
        
        # Combine: y_{n+1} = y_n + (dt/6)(k1 + 2*k2 + 2*k3 + k4)
        new_bodies = []
        for i in range(n):
            new_x = bodies[i].x + (dt / 6.0) * (
                k1_pos[i][0] + 2*k2_pos[i][0] + 2*k3_pos[i][0] + k4_pos[i][0]
            )
            new_y = bodies[i].y + (dt / 6.0) * (
                k1_pos[i][1] + 2*k2_pos[i][1] + 2*k3_pos[i][1] + k4_pos[i][1]
            )
            new_vx = bodies[i].vx + (dt / 6.0) * (
                k1_vel[i][0] + 2*k2_vel[i][0] + 2*k3_vel[i][0] + k4_vel[i][0]
            )
            new_vy = bodies[i].vy + (dt / 6.0) * (
                k1_vel[i][1] + 2*k2_vel[i][1] + 2*k3_vel[i][1] + k4_vel[i][1]
            )
            new_bodies.append(Body(new_x, new_y, new_vx, new_vy, bodies[i].mass))
        
        return new_bodies
    
    def simulate(self, initial_bodies: List[Body]) -> List[Body]:
        """
        Run simulation from initial conditions.
        
        Args:
            initial_bodies: List of three initial body states
            
        Returns:
            Final body states after simulation
            
        Raises:
            ValueError: If not exactly 3 bodies provided
        """
        if len(initial_bodies) != 3:
            raise ValueError(f"Expected 3 bodies, got {len(initial_bodies)}")
        
        bodies = list(initial_bodies)
        
        for _ in range(self.params.steps):
            bodies = self._rk4_step(
                bodies,
                self.params.dt,
                self.params.G,
                self.params.softening,
            )
        
        return bodies
    
    @staticmethod
    def figure_8_initial_conditions() -> List[Body]:
        """
        Get figure-8 orbit initial conditions.
        
        The figure-8 orbit is a known stable periodic solution
        to the three-body problem discovered by Moore (1993).
        It provides bounded chaotic behavior when perturbed.
        
        Returns:
            List of three bodies in figure-8 configuration
        """
        return [
            Body(
                x=0.97000436,
                y=-0.24308753,
                vx=0.466203685,
                vy=0.43236573,
                mass=1.0,
            ),
            Body(
                x=-0.97000436,
                y=0.24308753,
                vx=0.466203685,
                vy=0.43236573,
                mass=1.0,
            ),
            Body(
                x=0.0,
                y=0.0,
                vx=-0.93240737,
                vy=-0.86473146,
                mass=1.0,
            ),
        ]
    
    @staticmethod
    def create_seeded_initial_conditions(seed_hex: str) -> List[Body]:
        """
        Create deterministic initial conditions from a seed.
        
        Uses the seed to generate small perturbations to the
        figure-8 orbit, creating unique but bounded initial conditions.
        
        Args:
            seed_hex: Hexadecimal seed string (at least 32 chars)
            
        Returns:
            List of three bodies with seeded perturbations
        """
        # Ensure we have enough seed bytes
        seed_hex = seed_hex.ljust(32, '0')[:32]
        seed_bytes = bytes.fromhex(seed_hex)
        
        # Convert to perturbation values (small, bounded)
        perturbations = []
        for i in range(0, 16, 2):
            val = int.from_bytes(seed_bytes[i:i+2], 'big')
            # Scale to [-0.001, 0.001]
            perturbations.append((val / 65535.0 - 0.5) * 0.002)
        
        # Apply perturbations to figure-8 orbit
        base = ThreeBodySimulator.figure_8_initial_conditions()
        
        return [
            Body(
                x=base[0].x + perturbations[0],
                y=base[0].y + perturbations[1],
                vx=base[0].vx + perturbations[2],
                vy=base[0].vy + perturbations[3],
                mass=1.0,
            ),
            Body(
                x=base[1].x + perturbations[4],
                y=base[1].y + perturbations[5],
                vx=base[1].vx + perturbations[6],
                vy=base[1].vy + perturbations[7],
                mass=1.0,
            ),
            Body(
                x=base[2].x,
                y=base[2].y,
                vx=base[2].vx,
                vy=base[2].vy,
                mass=1.0,
            ),
        ]

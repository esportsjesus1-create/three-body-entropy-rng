"""
Three-Body Physics Simulation using RK4 (Runge-Kutta 4th order) integration.
Provides deterministic, reproducible entropy generation from chaotic dynamics.
"""

import math
import hashlib
from typing import List, Tuple, Dict, Any
from dataclasses import dataclass, asdict


@dataclass
class Body:
    """Represents a body in the three-body system."""
    x: float
    y: float
    vx: float
    vy: float
    mass: float = 1.0
    
    def copy(self) -> 'Body':
        return Body(self.x, self.y, self.vx, self.vy, self.mass)


@dataclass
class SimulationParams:
    """Parameters for the three-body simulation."""
    dt: float = 0.001  # Time step
    steps: int = 10000  # Number of integration steps
    G: float = 1.0  # Gravitational constant
    softening: float = 0.01  # Softening parameter to prevent singularities


class ThreeBodySimulator:
    """
    Deterministic three-body physics simulator using RK4 integration.
    
    The three-body problem is chaotic - small changes in initial conditions
    lead to exponentially divergent trajectories. This property makes it
    excellent for entropy generation.
    """
    
    def __init__(self, params: SimulationParams = None):
        self.params = params or SimulationParams()
    
    def _compute_accelerations(
        self, 
        bodies: List[Body], 
        G: float, 
        softening: float
    ) -> List[Tuple[float, float]]:
        """Compute gravitational accelerations for all bodies."""
        accelerations = []
        
        for i, body_i in enumerate(bodies):
            ax, ay = 0.0, 0.0
            
            for j, body_j in enumerate(bodies):
                if i == j:
                    continue
                
                dx = body_j.x - body_i.x
                dy = body_j.y - body_i.y
                
                # Distance with softening to prevent singularities
                dist_sq = dx * dx + dy * dy + softening * softening
                dist = math.sqrt(dist_sq)
                dist_cubed = dist_sq * dist
                
                # Gravitational acceleration
                force_factor = G * body_j.mass / dist_cubed
                ax += force_factor * dx
                ay += force_factor * dy
            
            accelerations.append((ax, ay))
        
        return accelerations
    
    def _rk4_step(
        self, 
        bodies: List[Body], 
        dt: float, 
        G: float, 
        softening: float
    ) -> List[Body]:
        """Perform one RK4 integration step."""
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
                bodies[i].mass
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
                bodies[i].mass
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
                bodies[i].mass
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
    
    def simulate(
        self, 
        initial_bodies: List[Body],
        sample_interval: int = 100
    ) -> Dict[str, Any]:
        """
        Run the three-body simulation.
        
        Args:
            initial_bodies: List of 3 Body objects with initial conditions
            sample_interval: How often to sample trajectory for output
            
        Returns:
            Dictionary containing simulation results and entropy
        """
        if len(initial_bodies) != 3:
            raise ValueError("Three-body simulation requires exactly 3 bodies")
        
        bodies = [b.copy() for b in initial_bodies]
        trajectory_samples = [[] for _ in range(3)]
        
        # Run simulation
        for step in range(self.params.steps):
            if step % sample_interval == 0:
                for i, body in enumerate(bodies):
                    trajectory_samples[i].append({
                        "step": step,
                        "x": body.x,
                        "y": body.y,
                        "vx": body.vx,
                        "vy": body.vy
                    })
            
            bodies = self._rk4_step(
                bodies, 
                self.params.dt, 
                self.params.G, 
                self.params.softening
            )
        
        # Final state
        final_state = [asdict(b) for b in bodies]
        
        # Compute theta (angle between body 0 and body 1)
        theta = math.atan2(
            bodies[1].y - bodies[0].y,
            bodies[1].x - bodies[0].x
        )
        
        # Generate entropy from final state
        # Use high-precision representation of final positions
        entropy_input = "|".join([
            f"{b.x:.15e}|{b.y:.15e}|{b.vx:.15e}|{b.vy:.15e}"
            for b in bodies
        ])
        entropy_hash = hashlib.sha256(entropy_input.encode('utf-8')).hexdigest()
        
        # Normalize theta to [0, 1) for entropy
        theta_normalized = (theta + math.pi) / (2 * math.pi)
        
        return {
            "initial_conditions": [asdict(b) for b in initial_bodies],
            "final_state": final_state,
            "theta": theta,
            "theta_normalized": theta_normalized,
            "entropy_hex": entropy_hash,
            "entropy_input": entropy_input,
            "trajectory_samples": trajectory_samples,
            "params": asdict(self.params)
        }
    
    @staticmethod
    def create_seeded_initial_conditions(seed_hex: str) -> List[Body]:
        """
        Create deterministic initial conditions from a seed.
        
        Uses the seed to perturb a known figure-8 orbit configuration,
        ensuring chaotic divergence while maintaining bounded orbits.
        """
        # Parse seed to get perturbation values
        seed_bytes = bytes.fromhex(seed_hex[:32])  # Use first 16 bytes
        
        # Convert to perturbation values (small, bounded)
        perturbations = []
        for i in range(0, 16, 2):
            val = int.from_bytes(seed_bytes[i:i+2], 'big')
            # Scale to [-0.001, 0.001]
            perturbations.append((val / 65535.0 - 0.5) * 0.002)
        
        # Figure-8 orbit initial conditions (known stable configuration)
        # These produce bounded, chaotic orbits
        base_bodies = [
            Body(
                x=0.97000436 + perturbations[0],
                y=-0.24308753 + perturbations[1],
                vx=0.466203685 + perturbations[2],
                vy=0.43236573 + perturbations[3],
                mass=1.0
            ),
            Body(
                x=-0.97000436 + perturbations[4],
                y=0.24308753 + perturbations[5],
                vx=0.466203685 + perturbations[6],
                vy=0.43236573 + perturbations[7],
                mass=1.0
            ),
            Body(
                x=0.0,
                y=0.0,
                vx=-0.93240737,
                vy=-0.86473146,
                mass=1.0
            )
        ]
        
        return base_bodies


def generate_entropy_from_seed(seed_hex: str, params: SimulationParams = None) -> Dict[str, Any]:
    """
    Generate entropy from a seed using three-body physics simulation.
    
    This is the main entry point for entropy generation.
    The result is deterministic - same seed always produces same entropy.
    """
    simulator = ThreeBodySimulator(params)
    initial_bodies = ThreeBodySimulator.create_seeded_initial_conditions(seed_hex)
    result = simulator.simulate(initial_bodies)
    result["seed"] = seed_hex
    return result

"""Tests for ThreeBodySimulator."""

import pytest
from physics_engine.body import Body
from physics_engine.simulation import ThreeBodySimulator, SimulationParams


class TestSimulationParams:
    """Tests for SimulationParams."""
    
    def test_defaults(self):
        """Test default parameters."""
        params = SimulationParams()
        assert params.dt == 0.001
        assert params.steps == 10000
        assert params.G == 1.0
        assert params.softening == 0.01
    
    def test_custom_params(self):
        """Test custom parameters."""
        params = SimulationParams(dt=0.01, steps=100, G=2.0, softening=0.1)
        assert params.dt == 0.01
        assert params.steps == 100
        assert params.G == 2.0
        assert params.softening == 0.1
    
    def test_to_dict(self):
        """Test conversion to dictionary."""
        params = SimulationParams(dt=0.001, steps=1000)
        d = params.to_dict()
        assert d["dt"] == 0.001
        assert d["steps"] == 1000
        assert d["G"] == 1.0
        assert d["softening"] == 0.01


class TestThreeBodySimulator:
    """Tests for ThreeBodySimulator."""
    
    def test_creation_default_params(self):
        """Test simulator creation with default params."""
        sim = ThreeBodySimulator()
        assert sim.params.dt == 0.001
        assert sim.params.steps == 10000
    
    def test_creation_custom_params(self):
        """Test simulator creation with custom params."""
        params = SimulationParams(steps=100)
        sim = ThreeBodySimulator(params)
        assert sim.params.steps == 100
    
    def test_simulate_returns_three_bodies(self):
        """Test simulation returns three bodies."""
        params = SimulationParams(steps=10)
        sim = ThreeBodySimulator(params)
        initial = ThreeBodySimulator.figure_8_initial_conditions()
        
        final = sim.simulate(initial)
        assert len(final) == 3
        assert all(isinstance(b, Body) for b in final)
    
    def test_simulate_wrong_body_count(self):
        """Test simulation raises error for wrong body count."""
        sim = ThreeBodySimulator(SimulationParams(steps=10))
        
        with pytest.raises(ValueError):
            sim.simulate([Body(0, 0, 0, 0)])
        
        with pytest.raises(ValueError):
            sim.simulate([Body(0, 0, 0, 0)] * 4)
    
    def test_simulate_deterministic(self):
        """Test simulation is deterministic."""
        params = SimulationParams(steps=100)
        sim = ThreeBodySimulator(params)
        initial = ThreeBodySimulator.figure_8_initial_conditions()
        
        final1 = sim.simulate(initial)
        final2 = sim.simulate(initial)
        
        for b1, b2 in zip(final1, final2):
            assert b1.x == b2.x
            assert b1.y == b2.y
            assert b1.vx == b2.vx
            assert b1.vy == b2.vy
    
    def test_simulate_changes_state(self):
        """Test simulation changes body states."""
        params = SimulationParams(steps=100)
        sim = ThreeBodySimulator(params)
        initial = ThreeBodySimulator.figure_8_initial_conditions()
        
        final = sim.simulate(initial)
        
        # At least one body should have moved
        moved = False
        for i, f in zip(initial, final):
            if i.x != f.x or i.y != f.y:
                moved = True
                break
        assert moved
    
    def test_figure_8_initial_conditions(self):
        """Test figure-8 initial conditions."""
        bodies = ThreeBodySimulator.figure_8_initial_conditions()
        
        assert len(bodies) == 3
        assert all(b.mass == 1.0 for b in bodies)
        
        # Check symmetry: bodies 0 and 1 are symmetric
        assert bodies[0].x == -bodies[1].x
        assert bodies[0].y == -bodies[1].y
        
        # Body 2 is at origin
        assert bodies[2].x == 0.0
        assert bodies[2].y == 0.0
    
    def test_create_seeded_initial_conditions(self):
        """Test seeded initial conditions."""
        seed = "abc123def456abc123def456abc123de"
        bodies = ThreeBodySimulator.create_seeded_initial_conditions(seed)
        
        assert len(bodies) == 3
        assert all(b.mass == 1.0 for b in bodies)
    
    def test_seeded_conditions_deterministic(self):
        """Test seeded conditions are deterministic."""
        seed = "abc123def456abc123def456abc123de"
        
        bodies1 = ThreeBodySimulator.create_seeded_initial_conditions(seed)
        bodies2 = ThreeBodySimulator.create_seeded_initial_conditions(seed)
        
        for b1, b2 in zip(bodies1, bodies2):
            assert b1.x == b2.x
            assert b1.y == b2.y
            assert b1.vx == b2.vx
            assert b1.vy == b2.vy
    
    def test_different_seeds_different_conditions(self):
        """Test different seeds produce different conditions."""
        seed1 = "abc123def456abc123def456abc123de"
        seed2 = "def456abc123def456abc123def456ab"
        
        bodies1 = ThreeBodySimulator.create_seeded_initial_conditions(seed1)
        bodies2 = ThreeBodySimulator.create_seeded_initial_conditions(seed2)
        
        # At least one body should differ
        different = False
        for b1, b2 in zip(bodies1, bodies2):
            if b1.x != b2.x or b1.y != b2.y:
                different = True
                break
        assert different
    
    def test_short_seed_padded(self):
        """Test short seeds are padded."""
        short_seed = "abc"
        bodies = ThreeBodySimulator.create_seeded_initial_conditions(short_seed)
        assert len(bodies) == 3
    
    def test_simulation_bounded(self):
        """Test simulation stays bounded (no escape to infinity)."""
        params = SimulationParams(steps=1000)
        sim = ThreeBodySimulator(params)
        initial = ThreeBodySimulator.figure_8_initial_conditions()
        
        final = sim.simulate(initial)
        
        # Bodies should stay within reasonable bounds
        for body in final:
            assert abs(body.x) < 100
            assert abs(body.y) < 100
            assert abs(body.vx) < 100
            assert abs(body.vy) < 100


class TestRK4Integration:
    """Tests for RK4 integration accuracy."""
    
    def test_energy_approximately_conserved(self):
        """Test that total energy is approximately conserved."""
        params = SimulationParams(dt=0.001, steps=1000, G=1.0, softening=0.01)
        sim = ThreeBodySimulator(params)
        initial = ThreeBodySimulator.figure_8_initial_conditions()
        
        def compute_energy(bodies):
            # Kinetic energy
            ke = sum(0.5 * b.mass * (b.vx**2 + b.vy**2) for b in bodies)
            
            # Potential energy
            pe = 0
            for i in range(len(bodies)):
                for j in range(i+1, len(bodies)):
                    dx = bodies[j].x - bodies[i].x
                    dy = bodies[j].y - bodies[i].y
                    r = (dx**2 + dy**2 + params.softening**2) ** 0.5
                    pe -= params.G * bodies[i].mass * bodies[j].mass / r
            
            return ke + pe
        
        initial_energy = compute_energy(initial)
        final = sim.simulate(initial)
        final_energy = compute_energy(final)
        
        # Energy should be conserved within ~10% for this step count
        relative_error = abs(final_energy - initial_energy) / abs(initial_energy)
        assert relative_error < 0.1

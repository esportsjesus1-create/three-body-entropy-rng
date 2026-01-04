"""Tests for physics-engine CLI."""

import json
import pytest
from physics_engine.cli import main


class TestCmdSimulate:
    """Tests for simulate command."""
    
    def test_simulate_basic(self, capsys):
        """Test basic simulation."""
        result = main(["simulate", "abc123"])
        assert result == 0
        
        captured = capsys.readouterr()
        output = json.loads(captured.out)
        
        assert "entropy_hex" in output
        assert "theta" in output
        assert "final_state" in output
    
    def test_simulate_custom_steps(self, capsys):
        """Test simulation with custom steps."""
        result = main(["simulate", "abc123", "--steps", "100"])
        assert result == 0
        
        captured = capsys.readouterr()
        output = json.loads(captured.out)
        assert output["params"]["steps"] == 100
    
    def test_simulate_deterministic(self, capsys):
        """Test simulation is deterministic."""
        main(["simulate", "abc123", "--steps", "100"])
        output1 = json.loads(capsys.readouterr().out)
        
        main(["simulate", "abc123", "--steps", "100"])
        output2 = json.loads(capsys.readouterr().out)
        
        assert output1["entropy_hex"] == output2["entropy_hex"]


class TestCmdVerify:
    """Tests for verify command."""
    
    def test_verify_passes(self, capsys):
        """Test verify command passes."""
        result = main(["verify"])
        assert result == 0
    
    def test_verify_verbose(self, capsys):
        """Test verify with verbose output."""
        result = main(["verify", "--verbose"])
        assert result == 0
        
        captured = capsys.readouterr()
        output = json.loads(captured.out)
        assert "passed" in output
        assert "results" in output


class TestCmdGenerateVector:
    """Tests for generate-vector command."""
    
    def test_generate_vector(self, capsys):
        """Test generating a golden vector."""
        result = main(["generate-vector", "test_vector", "abc123"])
        assert result == 0
        
        captured = capsys.readouterr()
        output = json.loads(captured.out)
        
        assert output["name"] == "test_vector"
        assert output["seed"] == "abc123"
        assert "expected_entropy_hex" in output


class TestCmdListVectors:
    """Tests for list-vectors command."""
    
    def test_list_vectors(self, capsys):
        """Test listing golden vectors."""
        result = main(["list-vectors"])
        assert result == 0
        
        captured = capsys.readouterr()
        assert "zero_seed" in captured.out


class TestCmdFigure8:
    """Tests for figure8 command."""
    
    def test_figure8(self, capsys):
        """Test figure-8 initial conditions."""
        result = main(["figure8"])
        assert result == 0
        
        captured = capsys.readouterr()
        output = json.loads(captured.out)
        
        assert "bodies" in output
        assert len(output["bodies"]) == 3


class TestMainHelp:
    """Tests for main help."""
    
    def test_no_command(self, capsys):
        """Test running without command shows help."""
        result = main([])
        assert result == 1

"""
Command-line interface for physics-engine.

Provides standalone tools for testing and using the physics
simulation without requiring the full API server.
"""

import argparse
import json
import sys
from typing import Optional

from .simulation import ThreeBodySimulator, SimulationParams
from .entropy import generate_entropy_from_seed
from .golden_vectors import verify_golden_vectors, generate_golden_vector, GOLDEN_VECTORS


def cmd_simulate(args: argparse.Namespace) -> int:
    """Run simulation and output results."""
    params = SimulationParams(
        dt=args.dt,
        steps=args.steps,
        G=args.G,
        softening=args.softening,
    )
    
    result = generate_entropy_from_seed(args.seed, params)
    
    # Remove bytes from output (not JSON serializable)
    output = {k: v for k, v in result.items() if k != "entropy_bytes"}
    
    print(json.dumps(output, indent=2))
    return 0


def cmd_verify(args: argparse.Namespace) -> int:
    """Verify golden vectors for determinism."""
    result = verify_golden_vectors()
    
    if args.verbose:
        print(json.dumps(result, indent=2))
    else:
        if result["passed"]:
            print(f"All {result['total']} golden vectors passed")
        else:
            print(f"FAILED: {len(result['failures'])} of {result['total']} vectors failed")
            for name in result["failures"]:
                print(f"  - {name}")
    
    return 0 if result["passed"] else 1


def cmd_generate_vector(args: argparse.Namespace) -> int:
    """Generate a new golden vector."""
    params = SimulationParams(
        dt=args.dt,
        steps=args.steps,
        G=args.G,
        softening=args.softening,
    )
    
    vector = generate_golden_vector(args.name, args.seed, params)
    print(json.dumps(vector, indent=2))
    return 0


def cmd_list_vectors(args: argparse.Namespace) -> int:
    """List all golden vectors."""
    for i, vector in enumerate(GOLDEN_VECTORS):
        print(f"{i+1}. {vector['name']}")
        print(f"   Seed: {vector['seed']}")
        print(f"   Steps: {vector['params']['steps']}")
    return 0


def cmd_figure8(args: argparse.Namespace) -> int:
    """Show figure-8 initial conditions."""
    bodies = ThreeBodySimulator.figure_8_initial_conditions()
    output = {
        "description": "Figure-8 orbit initial conditions",
        "bodies": [b.to_dict() for b in bodies],
    }
    print(json.dumps(output, indent=2))
    return 0


def main(argv: Optional[list] = None) -> int:
    """Main entry point for CLI."""
    parser = argparse.ArgumentParser(
        prog="physics-cli",
        description="Three-body physics simulation for entropy generation",
    )
    subparsers = parser.add_subparsers(dest="command", help="Available commands")
    
    # simulate command
    sim_parser = subparsers.add_parser("simulate", help="Run simulation")
    sim_parser.add_argument("seed", help="Hex seed for initial conditions")
    sim_parser.add_argument("--dt", type=float, default=0.001, help="Time step")
    sim_parser.add_argument("--steps", type=int, default=5000, help="Number of steps")
    sim_parser.add_argument("--G", type=float, default=1.0, help="Gravitational constant")
    sim_parser.add_argument("--softening", type=float, default=0.01, help="Softening parameter")
    
    # verify command
    verify_parser = subparsers.add_parser("verify", help="Verify golden vectors")
    verify_parser.add_argument("-v", "--verbose", action="store_true", help="Verbose output")
    
    # generate-vector command
    gen_parser = subparsers.add_parser("generate-vector", help="Generate golden vector")
    gen_parser.add_argument("name", help="Vector name")
    gen_parser.add_argument("seed", help="Hex seed")
    gen_parser.add_argument("--dt", type=float, default=0.001, help="Time step")
    gen_parser.add_argument("--steps", type=int, default=1000, help="Number of steps")
    gen_parser.add_argument("--G", type=float, default=1.0, help="Gravitational constant")
    gen_parser.add_argument("--softening", type=float, default=0.01, help="Softening parameter")
    
    # list-vectors command
    list_parser = subparsers.add_parser("list-vectors", help="List golden vectors")
    
    # figure8 command
    fig8_parser = subparsers.add_parser("figure8", help="Show figure-8 initial conditions")
    
    args = parser.parse_args(argv)
    
    if not args.command:
        parser.print_help()
        return 1
    
    commands = {
        "simulate": cmd_simulate,
        "verify": cmd_verify,
        "generate-vector": cmd_generate_vector,
        "list-vectors": cmd_list_vectors,
        "figure8": cmd_figure8,
    }
    
    return commands[args.command](args)


if __name__ == "__main__":
    sys.exit(main())

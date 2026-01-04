"""
Seed chain verification utilities.

Provides functions for independent verification of seed chains
without requiring the full chain data.
"""

import hashlib
import hmac
import json
from typing import List, Optional


def verify_seed_at_index(
    genesis_seed: str,
    seed: str,
    index: int,
) -> bool:
    """
    Verify a seed was correctly derived from genesis at index.
    
    This allows anyone to independently verify that a seed
    belongs to a chain without having the full chain.
    
    Args:
        genesis_seed: Initial seed of the chain
        seed: Seed to verify
        index: Expected index in chain
        
    Returns:
        True if seed matches expected derivation
    """
    # Derive seed at index from genesis
    current = genesis_seed
    for i in range(index + 1):
        current = hmac.new(
            current.encode(),
            f"seed:{i}".encode(),
            hashlib.sha256,
        ).hexdigest()
    
    return current == seed


def verify_seed_chain(
    genesis_seed: str,
    seeds: List[str],
    chain_hash: str,
) -> dict:
    """
    Verify an entire seed chain.
    
    Checks that:
    1. All seeds are correctly derived from genesis
    2. Chain hash matches the seeds
    
    Args:
        genesis_seed: Initial seed
        seeds: List of seeds to verify
        chain_hash: Expected chain hash
        
    Returns:
        Verification result with details
    """
    errors = []
    
    # Verify each seed derivation
    current = genesis_seed
    for i, seed in enumerate(seeds):
        expected = hmac.new(
            current.encode(),
            f"seed:{i}".encode(),
            hashlib.sha256,
        ).hexdigest()
        
        if expected != seed:
            errors.append({
                "index": i,
                "expected": expected[:16] + "...",
                "actual": seed[:16] + "...",
                "error": "seed_mismatch",
            })
        
        current = expected
    
    # Verify chain hash
    chain_data = json.dumps({
        "genesis": genesis_seed,
        "length": len(seeds),
        "seeds": seeds,
    }, sort_keys=True)
    computed_hash = hashlib.sha256(chain_data.encode()).hexdigest()
    
    hash_valid = computed_hash == chain_hash
    if not hash_valid:
        errors.append({
            "error": "chain_hash_mismatch",
            "expected": chain_hash[:16] + "...",
            "computed": computed_hash[:16] + "...",
        })
    
    return {
        "valid": len(errors) == 0,
        "chain_length": len(seeds),
        "hash_valid": hash_valid,
        "derivation_valid": all(e.get("error") != "seed_mismatch" for e in errors),
        "errors": errors,
    }


def compute_chain_hash(genesis_seed: str, seeds: List[str]) -> str:
    """
    Compute the chain hash for a set of seeds.
    
    Args:
        genesis_seed: Initial seed
        seeds: List of seeds
        
    Returns:
        Chain hash
    """
    chain_data = json.dumps({
        "genesis": genesis_seed,
        "length": len(seeds),
        "seeds": seeds,
    }, sort_keys=True)
    return hashlib.sha256(chain_data.encode()).hexdigest()


def verify_proof(proof: dict) -> bool:
    """
    Verify a seed proof.
    
    Args:
        proof: Proof from SeedChain.get_verification_proof()
        
    Returns:
        True if proof is valid
    """
    return verify_seed_at_index(
        genesis_seed=proof["genesis_seed"],
        seed=proof["seed"],
        index=proof["index"],
    )

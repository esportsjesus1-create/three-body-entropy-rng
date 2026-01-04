"""
Seed Chain implementation.

Provides a deterministic seed chain that prevents seed grinding attacks
by pre-committing to a sequence of seeds.
"""

import hashlib
import hmac
import secrets
from dataclasses import dataclass, field
from typing import List, Optional
import json


@dataclass
class SeedChainConfig:
    """
    Configuration for seed chain generation.
    
    Attributes:
        length: Number of seeds to generate
        hash_algorithm: Hash algorithm for chain derivation
    """
    length: int = 1000
    hash_algorithm: str = "sha256"


@dataclass
class SeedChain:
    """
    Pre-committed seed chain to prevent seed grinding.
    
    The chain is generated deterministically from a genesis seed,
    and the chain hash is published before any games. Seeds must
    be used in order and cannot be skipped.
    
    Attributes:
        genesis_seed: Initial seed for chain generation
        seeds: List of derived seeds
        chain_hash: Hash of entire chain (publish before games)
        current_index: Next seed index to use
    """
    genesis_seed: str
    seeds: List[str] = field(default_factory=list)
    chain_hash: str = ""
    current_index: int = 0
    config: SeedChainConfig = field(default_factory=SeedChainConfig)
    
    @classmethod
    def generate(
        cls,
        genesis_seed: Optional[str] = None,
        length: int = 1000,
        config: Optional[SeedChainConfig] = None,
    ) -> "SeedChain":
        """
        Generate a new seed chain.
        
        Args:
            genesis_seed: Initial entropy (generated if not provided)
            length: Number of seeds to generate
            config: Chain configuration
            
        Returns:
            New SeedChain instance
        """
        if config is None:
            config = SeedChainConfig(length=length)
        
        if genesis_seed is None:
            genesis_seed = secrets.token_hex(32)
        
        # Generate seeds deterministically
        seeds = []
        current = genesis_seed
        
        for i in range(config.length):
            # Derive next seed using HMAC-SHA256
            seed = hmac.new(
                current.encode(),
                f"seed:{i}".encode(),
                hashlib.sha256,
            ).hexdigest()
            seeds.append(seed)
            current = seed
        
        # Compute chain hash (commitment to entire chain)
        chain_data = json.dumps({
            "genesis": genesis_seed,
            "length": len(seeds),
            "seeds": seeds,
        }, sort_keys=True)
        chain_hash = hashlib.sha256(chain_data.encode()).hexdigest()
        
        return cls(
            genesis_seed=genesis_seed,
            seeds=seeds,
            chain_hash=chain_hash,
            current_index=0,
            config=config,
        )
    
    def get_next_seed(self) -> str:
        """
        Get the next seed in the chain.
        
        Seeds must be used in order and cannot be skipped.
        
        Returns:
            Next seed in chain
            
        Raises:
            IndexError: If chain is exhausted
        """
        if self.current_index >= len(self.seeds):
            raise IndexError("Seed chain exhausted")
        
        seed = self.seeds[self.current_index]
        self.current_index += 1
        return seed
    
    def get_seed_at_index(self, index: int) -> str:
        """
        Get seed at specific index (for verification).
        
        Args:
            index: Seed index
            
        Returns:
            Seed at index
            
        Raises:
            IndexError: If index out of range
        """
        if index < 0 or index >= len(self.seeds):
            raise IndexError(f"Seed index {index} out of range")
        return self.seeds[index]
    
    def verify_seed(self, seed: str, index: int) -> bool:
        """
        Verify a seed belongs to this chain at the given index.
        
        Args:
            seed: Seed to verify
            index: Expected index
            
        Returns:
            True if seed matches chain at index
        """
        try:
            return self.seeds[index] == seed
        except IndexError:
            return False
    
    def remaining_seeds(self) -> int:
        """Get number of remaining seeds in chain."""
        return len(self.seeds) - self.current_index
    
    def is_exhausted(self) -> bool:
        """Check if chain is exhausted."""
        return self.current_index >= len(self.seeds)
    
    def to_dict(self) -> dict:
        """
        Serialize chain to dictionary.
        
        Note: This includes all seeds - use for storage only,
        not for public disclosure.
        """
        return {
            "genesis_seed": self.genesis_seed,
            "seeds": self.seeds,
            "chain_hash": self.chain_hash,
            "current_index": self.current_index,
            "config": {
                "length": self.config.length,
                "hash_algorithm": self.config.hash_algorithm,
            },
        }
    
    @classmethod
    def from_dict(cls, data: dict) -> "SeedChain":
        """
        Deserialize chain from dictionary.
        
        Args:
            data: Serialized chain data
            
        Returns:
            SeedChain instance
        """
        config = SeedChainConfig(
            length=data["config"]["length"],
            hash_algorithm=data["config"]["hash_algorithm"],
        )
        return cls(
            genesis_seed=data["genesis_seed"],
            seeds=data["seeds"],
            chain_hash=data["chain_hash"],
            current_index=data["current_index"],
            config=config,
        )
    
    def get_public_commitment(self) -> dict:
        """
        Get public commitment data (safe to publish).
        
        This includes the chain hash and length but NOT the seeds.
        Publish this before any games start.
        
        Returns:
            Public commitment data
        """
        return {
            "chain_hash": self.chain_hash,
            "chain_length": len(self.seeds),
            "current_index": self.current_index,
        }
    
    def get_verification_proof(self, index: int) -> dict:
        """
        Get verification proof for a specific seed.
        
        This allows anyone to verify that a seed was used
        correctly from the pre-committed chain.
        
        Args:
            index: Seed index
            
        Returns:
            Verification proof
        """
        if index < 0 or index >= len(self.seeds):
            raise IndexError(f"Seed index {index} out of range")
        
        return {
            "seed": self.seeds[index],
            "index": index,
            "chain_hash": self.chain_hash,
            "genesis_seed": self.genesis_seed,
        }


def derive_seed_from_genesis(genesis_seed: str, index: int) -> str:
    """
    Derive a seed at a specific index from genesis seed.
    
    This allows independent verification without the full chain.
    
    Args:
        genesis_seed: Initial seed
        index: Target index
        
    Returns:
        Derived seed at index
    """
    current = genesis_seed
    for i in range(index + 1):
        current = hmac.new(
            current.encode() if i == 0 else current.encode(),
            f"seed:{i}".encode(),
            hashlib.sha256,
        ).hexdigest()
    return current

"""
Seed Chain - Pre-committed seed chain to prevent seed grinding attacks.

This module provides a deterministic seed chain that prevents operators
from trying multiple seeds to find favorable outcomes.

The seed chain works by:
1. Generating N seeds in advance
2. Publishing hash(seed_chain) before any games
3. Using seeds in order, cannot skip
4. Each seed is derived from the previous using HMAC-SHA256

Example:
    >>> from seed_chain import SeedChain
    >>> chain = SeedChain.generate(genesis_seed="initial_entropy", length=1000)
    >>> chain.chain_hash  # Publish this before games
    'abc123...'
    >>> seed = chain.get_next_seed()  # Use seeds in order
    >>> chain.verify_seed(seed, index=0)  # Anyone can verify
    True
"""

from .chain import SeedChain, SeedChainConfig
from .verification import verify_seed_chain, verify_seed_at_index

__all__ = [
    "SeedChain",
    "SeedChainConfig",
    "verify_seed_chain",
    "verify_seed_at_index",
]

__version__ = "1.0.0"

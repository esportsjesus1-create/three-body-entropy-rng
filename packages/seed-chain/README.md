# Seed Chain

Pre-committed seed chain to prevent seed grinding attacks in Three-Body RNG.

## Overview

The seed chain prevents operators from trying multiple seeds to find favorable outcomes by:

1. **Pre-generating seeds**: Generate N seeds in advance
2. **Public commitment**: Publish hash(seed_chain) before any games
3. **Sequential use**: Seeds must be used in order, cannot be skipped
4. **Deterministic derivation**: Each seed is derived from the previous using HMAC-SHA256

## Installation

```bash
cd packages/seed-chain
poetry install
```

## Usage

### Generate a Seed Chain

```python
from seed_chain import SeedChain

# Generate chain with 1000 seeds
chain = SeedChain.generate(length=1000)

# Publish this hash BEFORE any games start
print(f"Chain commitment: {chain.chain_hash}")
```

### Use Seeds in Order

```python
# Get next seed for each game
seed = chain.get_next_seed()

# Check remaining seeds
print(f"Remaining: {chain.remaining_seeds()}")
```

### Verify Seeds

```python
from seed_chain import verify_seed_at_index, verify_seed_chain

# Verify a single seed
is_valid = verify_seed_at_index(
    genesis_seed=chain.genesis_seed,
    seed=seed,
    index=0,
)

# Verify entire chain
result = verify_seed_chain(
    genesis_seed=chain.genesis_seed,
    seeds=chain.seeds,
    chain_hash=chain.chain_hash,
)
print(f"Chain valid: {result['valid']}")
```

### Persistence

```python
# Save chain
data = chain.to_dict()
# Store data securely...

# Restore chain
restored = SeedChain.from_dict(data)
```

## Security Properties

1. **No seed grinding**: Operator cannot try multiple seeds - they're pre-committed
2. **Verifiable**: Anyone can verify seeds match the published chain hash
3. **Sequential**: Seeds must be used in order, preventing selective use
4. **Deterministic**: Same genesis always produces same chain

## API Reference

### SeedChain

- `generate(genesis_seed, length, config)` - Create new chain
- `get_next_seed()` - Get next seed in sequence
- `get_seed_at_index(index)` - Get seed at specific index
- `verify_seed(seed, index)` - Verify seed belongs to chain
- `remaining_seeds()` - Count remaining seeds
- `is_exhausted()` - Check if chain is exhausted
- `to_dict()` / `from_dict(data)` - Serialization
- `get_public_commitment()` - Get safe-to-publish data
- `get_verification_proof(index)` - Get proof for specific seed

### Verification Functions

- `verify_seed_at_index(genesis, seed, index)` - Verify single seed
- `verify_seed_chain(genesis, seeds, hash)` - Verify entire chain
- `compute_chain_hash(genesis, seeds)` - Compute chain hash
- `verify_proof(proof)` - Verify a seed proof

## Testing

```bash
poetry run pytest
```

## License

MIT

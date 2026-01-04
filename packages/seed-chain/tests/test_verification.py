"""Tests for seed chain verification utilities."""

import pytest
from seed_chain import SeedChain, verify_seed_chain, verify_seed_at_index
from seed_chain.verification import compute_chain_hash, verify_proof


class TestVerifySeedAtIndex:
    """Tests for verify_seed_at_index function."""
    
    def test_verify_valid_seed(self):
        """Test verifying a valid seed."""
        chain = SeedChain.generate(genesis_seed="test_genesis", length=10)
        
        # Verify each seed
        for i, seed in enumerate(chain.seeds):
            assert verify_seed_at_index(chain.genesis_seed, seed, i)
    
    def test_verify_invalid_seed(self):
        """Test verifying an invalid seed."""
        chain = SeedChain.generate(genesis_seed="test_genesis", length=10)
        
        assert not verify_seed_at_index(chain.genesis_seed, "wrong_seed", 0)
    
    def test_verify_wrong_index(self):
        """Test verifying seed at wrong index."""
        chain = SeedChain.generate(genesis_seed="test_genesis", length=10)
        
        # Seed 0 at index 1 should fail
        assert not verify_seed_at_index(chain.genesis_seed, chain.seeds[0], 1)
    
    def test_verify_wrong_genesis(self):
        """Test verifying with wrong genesis seed."""
        chain = SeedChain.generate(genesis_seed="correct_genesis", length=10)
        
        assert not verify_seed_at_index("wrong_genesis", chain.seeds[0], 0)


class TestVerifySeedChain:
    """Tests for verify_seed_chain function."""
    
    def test_verify_valid_chain(self):
        """Test verifying a valid chain."""
        chain = SeedChain.generate(genesis_seed="test", length=10)
        
        result = verify_seed_chain(
            genesis_seed=chain.genesis_seed,
            seeds=chain.seeds,
            chain_hash=chain.chain_hash,
        )
        
        assert result["valid"]
        assert result["chain_length"] == 10
        assert result["hash_valid"]
        assert result["derivation_valid"]
        assert len(result["errors"]) == 0
    
    def test_verify_invalid_hash(self):
        """Test verifying chain with wrong hash."""
        chain = SeedChain.generate(genesis_seed="test", length=10)
        
        result = verify_seed_chain(
            genesis_seed=chain.genesis_seed,
            seeds=chain.seeds,
            chain_hash="wrong_hash",
        )
        
        assert not result["valid"]
        assert not result["hash_valid"]
        assert result["derivation_valid"]  # Seeds are still valid
        assert len(result["errors"]) == 1
    
    def test_verify_tampered_seed(self):
        """Test verifying chain with tampered seed."""
        chain = SeedChain.generate(genesis_seed="test", length=10)
        
        # Tamper with a seed
        tampered_seeds = chain.seeds.copy()
        tampered_seeds[5] = "tampered_seed"
        
        result = verify_seed_chain(
            genesis_seed=chain.genesis_seed,
            seeds=tampered_seeds,
            chain_hash=chain.chain_hash,
        )
        
        assert not result["valid"]
        assert not result["derivation_valid"]
        # Should have errors for tampered seed and subsequent seeds
        assert len(result["errors"]) > 0
    
    def test_verify_wrong_genesis(self):
        """Test verifying chain with wrong genesis."""
        chain = SeedChain.generate(genesis_seed="correct", length=10)
        
        result = verify_seed_chain(
            genesis_seed="wrong",
            seeds=chain.seeds,
            chain_hash=chain.chain_hash,
        )
        
        assert not result["valid"]
        assert not result["derivation_valid"]


class TestComputeChainHash:
    """Tests for compute_chain_hash function."""
    
    def test_compute_hash_matches_chain(self):
        """Test computed hash matches chain hash."""
        chain = SeedChain.generate(genesis_seed="test", length=10)
        
        computed = compute_chain_hash(chain.genesis_seed, chain.seeds)
        
        assert computed == chain.chain_hash
    
    def test_compute_hash_deterministic(self):
        """Test hash computation is deterministic."""
        chain = SeedChain.generate(genesis_seed="test", length=10)
        
        hash1 = compute_chain_hash(chain.genesis_seed, chain.seeds)
        hash2 = compute_chain_hash(chain.genesis_seed, chain.seeds)
        
        assert hash1 == hash2
    
    def test_compute_hash_different_seeds(self):
        """Test different seeds produce different hash."""
        chain1 = SeedChain.generate(genesis_seed="seed_a", length=10)
        chain2 = SeedChain.generate(genesis_seed="seed_b", length=10)
        
        hash1 = compute_chain_hash(chain1.genesis_seed, chain1.seeds)
        hash2 = compute_chain_hash(chain2.genesis_seed, chain2.seeds)
        
        assert hash1 != hash2


class TestVerifyProof:
    """Tests for verify_proof function."""
    
    def test_verify_valid_proof(self):
        """Test verifying a valid proof."""
        chain = SeedChain.generate(genesis_seed="test", length=10)
        
        proof = chain.get_verification_proof(5)
        
        assert verify_proof(proof)
    
    def test_verify_invalid_proof_wrong_seed(self):
        """Test verifying proof with wrong seed."""
        chain = SeedChain.generate(genesis_seed="test", length=10)
        
        proof = chain.get_verification_proof(5)
        proof["seed"] = "tampered_seed"
        
        assert not verify_proof(proof)
    
    def test_verify_invalid_proof_wrong_index(self):
        """Test verifying proof with wrong index."""
        chain = SeedChain.generate(genesis_seed="test", length=10)
        
        proof = chain.get_verification_proof(5)
        proof["index"] = 3  # Wrong index
        
        assert not verify_proof(proof)
    
    def test_verify_invalid_proof_wrong_genesis(self):
        """Test verifying proof with wrong genesis."""
        chain = SeedChain.generate(genesis_seed="test", length=10)
        
        proof = chain.get_verification_proof(5)
        proof["genesis_seed"] = "wrong_genesis"
        
        assert not verify_proof(proof)


class TestSeedChainSecurityProperties:
    """Tests for security properties of seed chain."""
    
    def test_cannot_predict_next_seed(self):
        """Test that seeds cannot be predicted without genesis."""
        chain = SeedChain.generate(genesis_seed="secret_genesis", length=10)
        
        # Given only the first seed, cannot derive the genesis
        # (This is a property of HMAC - cannot reverse)
        first_seed = chain.seeds[0]
        
        # Try to verify with a guessed genesis
        assert not verify_seed_at_index("guessed_genesis", first_seed, 0)
    
    def test_chain_hash_commits_to_all_seeds(self):
        """Test that chain hash changes if any seed changes."""
        chain = SeedChain.generate(genesis_seed="test", length=10)
        original_hash = chain.chain_hash
        
        # Changing any seed should change the hash
        for i in range(len(chain.seeds)):
            tampered = chain.seeds.copy()
            tampered[i] = "tampered"
            new_hash = compute_chain_hash(chain.genesis_seed, tampered)
            assert new_hash != original_hash
    
    def test_seeds_are_unique(self):
        """Test that all seeds in chain are unique."""
        chain = SeedChain.generate(genesis_seed="test", length=1000)
        
        assert len(set(chain.seeds)) == len(chain.seeds)
    
    def test_seeds_are_64_hex_chars(self):
        """Test that seeds are valid hex strings."""
        chain = SeedChain.generate(genesis_seed="test", length=10)
        
        for seed in chain.seeds:
            assert len(seed) == 64
            assert all(c in "0123456789abcdef" for c in seed)

"""Tests for SeedChain class."""

import pytest
from seed_chain import SeedChain, SeedChainConfig


class TestSeedChainGeneration:
    """Tests for seed chain generation."""
    
    def test_generate_with_defaults(self):
        """Test generating chain with default settings."""
        chain = SeedChain.generate(length=10)
        
        assert len(chain.seeds) == 10
        assert chain.chain_hash
        assert len(chain.chain_hash) == 64
        assert chain.current_index == 0
    
    def test_generate_with_genesis_seed(self):
        """Test generating chain with specific genesis seed."""
        chain = SeedChain.generate(genesis_seed="test_seed", length=5)
        
        assert chain.genesis_seed == "test_seed"
        assert len(chain.seeds) == 5
    
    def test_generate_deterministic(self):
        """Test that same genesis produces same chain."""
        chain1 = SeedChain.generate(genesis_seed="fixed_seed", length=10)
        chain2 = SeedChain.generate(genesis_seed="fixed_seed", length=10)
        
        assert chain1.seeds == chain2.seeds
        assert chain1.chain_hash == chain2.chain_hash
    
    def test_different_genesis_different_chain(self):
        """Test that different genesis produces different chain."""
        chain1 = SeedChain.generate(genesis_seed="seed_a", length=10)
        chain2 = SeedChain.generate(genesis_seed="seed_b", length=10)
        
        assert chain1.seeds != chain2.seeds
        assert chain1.chain_hash != chain2.chain_hash
    
    def test_generate_with_config(self):
        """Test generating chain with custom config."""
        config = SeedChainConfig(length=20)
        chain = SeedChain.generate(genesis_seed="test", config=config)
        
        assert len(chain.seeds) == 20
        assert chain.config.length == 20


class TestSeedChainUsage:
    """Tests for using seed chain."""
    
    def test_get_next_seed(self):
        """Test getting next seed in sequence."""
        chain = SeedChain.generate(genesis_seed="test", length=5)
        
        seed1 = chain.get_next_seed()
        seed2 = chain.get_next_seed()
        
        assert seed1 == chain.seeds[0]
        assert seed2 == chain.seeds[1]
        assert chain.current_index == 2
    
    def test_get_next_seed_exhausted(self):
        """Test error when chain is exhausted."""
        chain = SeedChain.generate(genesis_seed="test", length=2)
        
        chain.get_next_seed()
        chain.get_next_seed()
        
        with pytest.raises(IndexError, match="exhausted"):
            chain.get_next_seed()
    
    def test_get_seed_at_index(self):
        """Test getting seed at specific index."""
        chain = SeedChain.generate(genesis_seed="test", length=10)
        
        seed = chain.get_seed_at_index(5)
        assert seed == chain.seeds[5]
    
    def test_get_seed_at_index_out_of_range(self):
        """Test error for out of range index."""
        chain = SeedChain.generate(genesis_seed="test", length=5)
        
        with pytest.raises(IndexError):
            chain.get_seed_at_index(10)
    
    def test_remaining_seeds(self):
        """Test remaining seeds count."""
        chain = SeedChain.generate(genesis_seed="test", length=10)
        
        assert chain.remaining_seeds() == 10
        
        chain.get_next_seed()
        chain.get_next_seed()
        
        assert chain.remaining_seeds() == 8
    
    def test_is_exhausted(self):
        """Test exhaustion check."""
        chain = SeedChain.generate(genesis_seed="test", length=2)
        
        assert not chain.is_exhausted()
        
        chain.get_next_seed()
        assert not chain.is_exhausted()
        
        chain.get_next_seed()
        assert chain.is_exhausted()


class TestSeedChainVerification:
    """Tests for seed verification."""
    
    def test_verify_seed_valid(self):
        """Test verifying valid seed."""
        chain = SeedChain.generate(genesis_seed="test", length=10)
        
        assert chain.verify_seed(chain.seeds[0], 0)
        assert chain.verify_seed(chain.seeds[5], 5)
        assert chain.verify_seed(chain.seeds[9], 9)
    
    def test_verify_seed_invalid(self):
        """Test verifying invalid seed."""
        chain = SeedChain.generate(genesis_seed="test", length=10)
        
        assert not chain.verify_seed("wrong_seed", 0)
        assert not chain.verify_seed(chain.seeds[0], 1)  # Wrong index
    
    def test_verify_seed_out_of_range(self):
        """Test verifying seed at invalid index."""
        chain = SeedChain.generate(genesis_seed="test", length=5)
        
        assert not chain.verify_seed("any_seed", 10)


class TestSeedChainSerialization:
    """Tests for serialization."""
    
    def test_to_dict(self):
        """Test serializing to dictionary."""
        chain = SeedChain.generate(genesis_seed="test", length=5)
        chain.get_next_seed()
        
        data = chain.to_dict()
        
        assert data["genesis_seed"] == "test"
        assert len(data["seeds"]) == 5
        assert data["chain_hash"] == chain.chain_hash
        assert data["current_index"] == 1
        assert data["config"]["length"] == 5
    
    def test_from_dict(self):
        """Test deserializing from dictionary."""
        original = SeedChain.generate(genesis_seed="test", length=5)
        original.get_next_seed()
        
        data = original.to_dict()
        restored = SeedChain.from_dict(data)
        
        assert restored.genesis_seed == original.genesis_seed
        assert restored.seeds == original.seeds
        assert restored.chain_hash == original.chain_hash
        assert restored.current_index == original.current_index
    
    def test_roundtrip(self):
        """Test serialization roundtrip."""
        original = SeedChain.generate(genesis_seed="roundtrip_test", length=10)
        for _ in range(3):
            original.get_next_seed()
        
        restored = SeedChain.from_dict(original.to_dict())
        
        # Should be able to continue from same position
        assert restored.get_next_seed() == original.seeds[3]


class TestSeedChainPublicCommitment:
    """Tests for public commitment."""
    
    def test_get_public_commitment(self):
        """Test getting public commitment data."""
        chain = SeedChain.generate(genesis_seed="test", length=100)
        
        commitment = chain.get_public_commitment()
        
        assert commitment["chain_hash"] == chain.chain_hash
        assert commitment["chain_length"] == 100
        assert commitment["current_index"] == 0
        assert "seeds" not in commitment  # Seeds should not be public
    
    def test_get_verification_proof(self):
        """Test getting verification proof."""
        chain = SeedChain.generate(genesis_seed="test", length=10)
        
        proof = chain.get_verification_proof(5)
        
        assert proof["seed"] == chain.seeds[5]
        assert proof["index"] == 5
        assert proof["chain_hash"] == chain.chain_hash
        assert proof["genesis_seed"] == chain.genesis_seed
    
    def test_get_verification_proof_out_of_range(self):
        """Test error for out of range proof."""
        chain = SeedChain.generate(genesis_seed="test", length=5)
        
        with pytest.raises(IndexError):
            chain.get_verification_proof(10)

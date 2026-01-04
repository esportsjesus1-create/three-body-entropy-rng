"""Tests for key store."""

import pytest
from transparency_log.database import Database, DatabaseConfig
from transparency_log.key_store import KeyStore, StoredKey


@pytest.fixture
def store():
    """Create key store with in-memory database."""
    db = Database(DatabaseConfig(db_path=":memory:"))
    db.initialize()
    return KeyStore(db)


class TestStoredKey:
    """Tests for StoredKey class."""
    
    def test_to_dict_without_private(self):
        """Test conversion to dictionary without private key."""
        key = StoredKey(
            id=1,
            key_id="key-001",
            public_key_pem="-----BEGIN PUBLIC KEY-----",
            private_key_pem="-----BEGIN PRIVATE KEY-----",
            algorithm="RSA-4096",
            created_at=1000,
        )
        d = key.to_dict(include_private=False)
        
        assert d["key_id"] == "key-001"
        assert "private_key_pem" not in d
    
    def test_to_dict_with_private(self):
        """Test conversion to dictionary with private key."""
        key = StoredKey(
            id=1,
            key_id="key-001",
            public_key_pem="-----BEGIN PUBLIC KEY-----",
            private_key_pem="-----BEGIN PRIVATE KEY-----",
            algorithm="RSA-4096",
            created_at=1000,
        )
        d = key.to_dict(include_private=True)
        
        assert d["private_key_pem"] == "-----BEGIN PRIVATE KEY-----"


class TestKeyStore:
    """Tests for KeyStore class."""
    
    def test_create(self, store):
        """Test creating key."""
        key = store.create(
            key_id="key-001",
            public_key_pem="-----BEGIN PUBLIC KEY-----",
            private_key_pem="-----BEGIN PRIVATE KEY-----",
            algorithm="RSA-4096",
        )
        
        assert key.id > 0
        assert key.key_id == "key-001"
        assert key.is_active is True
    
    def test_create_with_metadata(self, store):
        """Test creating key with metadata."""
        key = store.create(
            key_id="key-001",
            public_key_pem="-----BEGIN PUBLIC KEY-----",
            algorithm="RSA-4096",
            metadata={"purpose": "signing"},
        )
        
        assert key.metadata == {"purpose": "signing"}
    
    def test_get(self, store):
        """Test getting key by ID."""
        store.create(
            key_id="key-001",
            public_key_pem="-----BEGIN PUBLIC KEY-----",
            algorithm="RSA-4096",
        )
        
        key = store.get("key-001")
        assert key is not None
        assert key.public_key_pem == "-----BEGIN PUBLIC KEY-----"
    
    def test_get_not_found(self, store):
        """Test getting non-existent key."""
        assert store.get("nonexistent") is None
    
    def test_get_active(self, store):
        """Test getting active key."""
        store.create(
            key_id="key-001",
            public_key_pem="-----BEGIN PUBLIC KEY-----",
            algorithm="RSA-4096",
        )
        
        key = store.get_active()
        assert key is not None
        assert key.key_id == "key-001"
    
    def test_get_active_none(self, store):
        """Test getting active key when none exists."""
        assert store.get_active() is None
    
    def test_activate(self, store):
        """Test activating key."""
        store.create(
            key_id="key-001",
            public_key_pem="-----BEGIN PUBLIC KEY-----",
            algorithm="RSA-4096",
        )
        store.create(
            key_id="key-002",
            public_key_pem="-----BEGIN PUBLIC KEY-----",
            algorithm="RSA-4096",
        )
        
        # Both are active initially, activate key-001
        result = store.activate("key-001")
        assert result is True
        
        # key-001 should be active, key-002 should not
        assert store.get("key-001").is_active is True
        assert store.get("key-002").is_active is False
    
    def test_deactivate(self, store):
        """Test deactivating key."""
        store.create(
            key_id="key-001",
            public_key_pem="-----BEGIN PUBLIC KEY-----",
            algorithm="RSA-4096",
        )
        
        result = store.deactivate("key-001")
        assert result is True
        assert store.get("key-001").is_active is False
    
    def test_list_all(self, store):
        """Test listing all keys."""
        store.create(
            key_id="key-001",
            public_key_pem="-----BEGIN PUBLIC KEY-----",
            algorithm="RSA-4096",
        )
        store.create(
            key_id="key-002",
            public_key_pem="-----BEGIN PUBLIC KEY-----",
            algorithm="RSA-4096",
        )
        
        keys = store.list_all()
        assert len(keys) == 2
    
    def test_delete(self, store):
        """Test deleting key."""
        store.create(
            key_id="key-001",
            public_key_pem="-----BEGIN PUBLIC KEY-----",
            algorithm="RSA-4096",
        )
        
        result = store.delete("key-001")
        assert result is True
        assert store.get("key-001") is None
    
    def test_rotate(self, store):
        """Test key rotation."""
        store.create(
            key_id="key-001",
            public_key_pem="-----BEGIN PUBLIC KEY 1-----",
            algorithm="RSA-4096",
        )
        
        new_key = store.rotate(
            new_key_id="key-002",
            public_key_pem="-----BEGIN PUBLIC KEY 2-----",
            algorithm="RSA-4096",
        )
        
        assert new_key.key_id == "key-002"
        assert new_key.is_active is True
        
        # Old key should be deactivated
        old_key = store.get("key-001")
        assert old_key.is_active is False

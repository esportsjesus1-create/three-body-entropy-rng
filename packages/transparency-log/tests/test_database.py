"""Tests for database module."""

import pytest
import tempfile
import os
from transparency_log.database import Database, DatabaseConfig, SCHEMA_SQL


@pytest.fixture
def temp_db():
    """Create temporary database."""
    with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as f:
        db_path = f.name
    
    db = Database(DatabaseConfig(db_path=db_path))
    db.initialize()
    yield db
    
    db.close()
    os.unlink(db_path)


@pytest.fixture
def memory_db():
    """Create in-memory database."""
    db = Database(DatabaseConfig(db_path=":memory:"))
    db.initialize()
    yield db
    db.close()


class TestDatabaseConfig:
    """Tests for DatabaseConfig class."""
    
    def test_defaults(self):
        """Test default configuration."""
        config = DatabaseConfig()
        assert config.db_path == "transparency.db"
        assert config.timeout == 30.0
        assert config.check_same_thread is False
    
    def test_custom_config(self):
        """Test custom configuration."""
        config = DatabaseConfig(
            db_path="/tmp/test.db",
            timeout=60.0,
            check_same_thread=True,
        )
        assert config.db_path == "/tmp/test.db"
        assert config.timeout == 60.0


class TestDatabase:
    """Tests for Database class."""
    
    def test_initialize(self, memory_db):
        """Test database initialization."""
        assert memory_db.is_initialized is True
    
    def test_execute(self, memory_db):
        """Test executing SQL."""
        cursor = memory_db.execute("SELECT 1 as value")
        row = cursor.fetchone()
        assert row["value"] == 1
    
    def test_execute_with_params(self, memory_db):
        """Test executing SQL with parameters."""
        memory_db.execute(
            "INSERT INTO commitments (commitment_hash, server_seed, entropy_hex, nonce, timestamp_ms, expires_ms, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
            ("hash1", "seed1", "entropy1", 1, 1000, 2000, 1000),
        )
        
        cursor = memory_db.execute(
            "SELECT * FROM commitments WHERE commitment_hash = ?",
            ("hash1",),
        )
        row = cursor.fetchone()
        assert row["server_seed"] == "seed1"
    
    def test_executemany(self, memory_db):
        """Test executing SQL with multiple parameter sets."""
        params = [
            ("hash1", "seed1", "entropy1", 1, 1000, 2000, 1000),
            ("hash2", "seed2", "entropy2", 2, 1000, 2000, 1000),
        ]
        memory_db.executemany(
            "INSERT INTO commitments (commitment_hash, server_seed, entropy_hex, nonce, timestamp_ms, expires_ms, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
            params,
        )
        
        cursor = memory_db.execute("SELECT COUNT(*) as count FROM commitments")
        assert cursor.fetchone()["count"] == 2
    
    def test_connection_context_manager(self, memory_db):
        """Test connection context manager."""
        with memory_db.connection() as conn:
            conn.execute(
                "INSERT INTO commitments (commitment_hash, server_seed, entropy_hex, nonce, timestamp_ms, expires_ms, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
                ("hash1", "seed1", "entropy1", 1, 1000, 2000, 1000),
            )
        
        cursor = memory_db.execute("SELECT * FROM commitments")
        assert cursor.fetchone() is not None
    
    def test_cursor_context_manager(self, memory_db):
        """Test cursor context manager."""
        with memory_db.cursor() as cursor:
            cursor.execute(
                "INSERT INTO commitments (commitment_hash, server_seed, entropy_hex, nonce, timestamp_ms, expires_ms, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
                ("hash1", "seed1", "entropy1", 1, 1000, 2000, 1000),
            )
        
        cursor = memory_db.execute("SELECT * FROM commitments")
        assert cursor.fetchone() is not None
    
    def test_tables_created(self, memory_db):
        """Test all tables are created."""
        cursor = memory_db.execute(
            "SELECT name FROM sqlite_master WHERE type='table'"
        )
        tables = {row["name"] for row in cursor.fetchall()}
        
        assert "commitments" in tables
        assert "keys" in tables
        assert "audit_log" in tables
        assert "hash_chain" in tables
    
    def test_file_persistence(self, temp_db):
        """Test data persists to file."""
        temp_db.execute(
            "INSERT INTO commitments (commitment_hash, server_seed, entropy_hex, nonce, timestamp_ms, expires_ms, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
            ("hash1", "seed1", "entropy1", 1, 1000, 2000, 1000),
        )
        
        # Verify data exists
        cursor = temp_db.execute("SELECT * FROM commitments")
        assert cursor.fetchone() is not None

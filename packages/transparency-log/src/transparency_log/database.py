"""
SQLite database connection and schema management.

Provides database initialization and connection handling.
"""

import sqlite3
import threading
from dataclasses import dataclass
from pathlib import Path
from typing import Optional
from contextlib import contextmanager


@dataclass
class DatabaseConfig:
    """
    Database configuration.
    
    Attributes:
        db_path: Path to SQLite database file
        timeout: Connection timeout in seconds
        check_same_thread: SQLite thread safety setting
    """
    db_path: str = "transparency.db"
    timeout: float = 30.0
    check_same_thread: bool = False


SCHEMA_SQL = """
-- Commitments table
CREATE TABLE IF NOT EXISTS commitments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    commitment_hash TEXT UNIQUE NOT NULL,
    server_seed TEXT NOT NULL,
    entropy_hex TEXT NOT NULL,
    nonce INTEGER NOT NULL,
    timestamp_ms INTEGER NOT NULL,
    expires_ms INTEGER NOT NULL,
    positions TEXT,
    client_seed TEXT,
    status TEXT DEFAULT 'pending',
    created_at INTEGER NOT NULL,
    revealed_at INTEGER,
    chain_index INTEGER,
    previous_hash TEXT
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_commitments_hash ON commitments(commitment_hash);
CREATE INDEX IF NOT EXISTS idx_commitments_status ON commitments(status);
CREATE INDEX IF NOT EXISTS idx_commitments_timestamp ON commitments(timestamp_ms);

-- Keys table for RSA key persistence
CREATE TABLE IF NOT EXISTS keys (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key_id TEXT UNIQUE NOT NULL,
    public_key_pem TEXT NOT NULL,
    private_key_pem TEXT,
    algorithm TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    expires_at INTEGER,
    is_active INTEGER DEFAULT 1,
    metadata TEXT
);

CREATE INDEX IF NOT EXISTS idx_keys_active ON keys(is_active);

-- Audit log table
CREATE TABLE IF NOT EXISTS audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp_ms INTEGER NOT NULL,
    action TEXT NOT NULL,
    commitment_hash TEXT,
    client_ip TEXT,
    details TEXT,
    entry_hash TEXT NOT NULL,
    previous_hash TEXT
);

CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_log(timestamp_ms);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_log(action);

-- Hash chain table for integrity verification
CREATE TABLE IF NOT EXISTS hash_chain (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    index_num INTEGER UNIQUE NOT NULL,
    commitment_hash TEXT NOT NULL,
    entry_hash TEXT NOT NULL,
    previous_hash TEXT,
    timestamp_ms INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_chain_index ON hash_chain(index_num);
"""


class Database:
    """
    SQLite database manager.
    
    Handles connection pooling, schema initialization, and
    provides context manager for transactions.
    
    Example:
        >>> db = Database(DatabaseConfig(db_path=":memory:"))
        >>> db.initialize()
        >>> with db.connection() as conn:
        ...     cursor = conn.execute("SELECT 1")
    """
    
    def __init__(self, config: Optional[DatabaseConfig] = None):
        """
        Initialize database manager.
        
        Args:
            config: Database configuration
        """
        self.config = config or DatabaseConfig()
        self._local = threading.local()
        self._initialized = False
    
    def _get_connection(self) -> sqlite3.Connection:
        """Get thread-local connection."""
        if not hasattr(self._local, 'connection') or self._local.connection is None:
            self._local.connection = sqlite3.connect(
                self.config.db_path,
                timeout=self.config.timeout,
                check_same_thread=self.config.check_same_thread,
            )
            self._local.connection.row_factory = sqlite3.Row
        return self._local.connection
    
    def initialize(self) -> None:
        """
        Initialize database schema.
        
        Creates tables if they don't exist.
        """
        conn = self._get_connection()
        conn.executescript(SCHEMA_SQL)
        conn.commit()
        self._initialized = True
    
    @contextmanager
    def connection(self):
        """
        Get database connection as context manager.
        
        Yields:
            sqlite3.Connection with automatic commit/rollback
        """
        conn = self._get_connection()
        try:
            yield conn
            conn.commit()
        except Exception:
            conn.rollback()
            raise
    
    @contextmanager
    def cursor(self):
        """
        Get database cursor as context manager.
        
        Yields:
            sqlite3.Cursor with automatic commit/rollback
        """
        with self.connection() as conn:
            cursor = conn.cursor()
            yield cursor
    
    def execute(self, sql: str, params: tuple = ()) -> sqlite3.Cursor:
        """
        Execute SQL statement.
        
        Args:
            sql: SQL statement
            params: Query parameters
            
        Returns:
            Cursor with results
        """
        conn = self._get_connection()
        cursor = conn.execute(sql, params)
        conn.commit()
        return cursor
    
    def executemany(self, sql: str, params_list: list) -> sqlite3.Cursor:
        """
        Execute SQL statement with multiple parameter sets.
        
        Args:
            sql: SQL statement
            params_list: List of parameter tuples
            
        Returns:
            Cursor with results
        """
        conn = self._get_connection()
        cursor = conn.executemany(sql, params_list)
        conn.commit()
        return cursor
    
    def close(self) -> None:
        """Close database connection."""
        if hasattr(self._local, 'connection') and self._local.connection:
            self._local.connection.close()
            self._local.connection = None
    
    @property
    def is_initialized(self) -> bool:
        """Check if database is initialized."""
        return self._initialized

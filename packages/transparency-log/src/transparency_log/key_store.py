"""
Persistent RSA key storage.

Provides SQLite-backed storage for RSA keys with
rotation and backup support.
"""

import json
import time
from dataclasses import dataclass
from typing import Optional, List, Dict, Any

from .database import Database


@dataclass
class StoredKey:
    """
    A stored RSA key record.
    
    Attributes:
        id: Database ID
        key_id: Unique key identifier
        public_key_pem: Public key in PEM format
        private_key_pem: Private key in PEM format (encrypted)
        algorithm: Key algorithm (e.g., RSA-4096-PSS-SHA256)
        created_at: Creation timestamp
        expires_at: Expiration timestamp
        is_active: Whether key is currently active
        metadata: Additional key metadata
    """
    id: int
    key_id: str
    public_key_pem: str
    private_key_pem: Optional[str]
    algorithm: str
    created_at: int
    expires_at: Optional[int] = None
    is_active: bool = True
    metadata: Optional[Dict[str, Any]] = None
    
    def to_dict(self, include_private: bool = False) -> Dict[str, Any]:
        """
        Convert to dictionary.
        
        Args:
            include_private: Whether to include private key
            
        Returns:
            Dictionary representation
        """
        d = {
            "id": self.id,
            "key_id": self.key_id,
            "public_key_pem": self.public_key_pem,
            "algorithm": self.algorithm,
            "created_at": self.created_at,
            "expires_at": self.expires_at,
            "is_active": self.is_active,
            "metadata": self.metadata,
        }
        if include_private:
            d["private_key_pem"] = self.private_key_pem
        return d
    
    @classmethod
    def from_row(cls, row) -> "StoredKey":
        """Create from database row."""
        metadata = json.loads(row["metadata"]) if row["metadata"] else None
        return cls(
            id=row["id"],
            key_id=row["key_id"],
            public_key_pem=row["public_key_pem"],
            private_key_pem=row["private_key_pem"],
            algorithm=row["algorithm"],
            created_at=row["created_at"],
            expires_at=row["expires_at"],
            is_active=bool(row["is_active"]),
            metadata=metadata,
        )


class KeyStore:
    """
    SQLite-backed RSA key storage.
    
    Provides CRUD operations for RSA keys with
    rotation and activation management.
    
    Example:
        >>> db = Database(DatabaseConfig(db_path=":memory:"))
        >>> db.initialize()
        >>> store = KeyStore(db)
        >>> store.create(
        ...     key_id="key-001",
        ...     public_key_pem="-----BEGIN PUBLIC KEY-----...",
        ...     private_key_pem="-----BEGIN PRIVATE KEY-----...",
        ...     algorithm="RSA-4096-PSS-SHA256",
        ... )
    """
    
    def __init__(self, database: Database):
        """
        Initialize key store.
        
        Args:
            database: Database instance
        """
        self.db = database
    
    def create(
        self,
        key_id: str,
        public_key_pem: str,
        private_key_pem: Optional[str] = None,
        algorithm: str = "RSA-4096-PSS-SHA256",
        expires_at: Optional[int] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> StoredKey:
        """
        Create a new key.
        
        Args:
            key_id: Unique key identifier
            public_key_pem: Public key in PEM format
            private_key_pem: Private key in PEM format
            algorithm: Key algorithm
            expires_at: Expiration timestamp
            metadata: Additional metadata
            
        Returns:
            Created StoredKey
        """
        created_at = int(time.time() * 1000)
        metadata_json = json.dumps(metadata) if metadata else None
        
        cursor = self.db.execute(
            """
            INSERT INTO keys (
                key_id, public_key_pem, private_key_pem, algorithm,
                created_at, expires_at, is_active, metadata
            ) VALUES (?, ?, ?, ?, ?, ?, 1, ?)
            """,
            (
                key_id, public_key_pem, private_key_pem, algorithm,
                created_at, expires_at, metadata_json,
            ),
        )
        
        return StoredKey(
            id=cursor.lastrowid,
            key_id=key_id,
            public_key_pem=public_key_pem,
            private_key_pem=private_key_pem,
            algorithm=algorithm,
            created_at=created_at,
            expires_at=expires_at,
            is_active=True,
            metadata=metadata,
        )
    
    def get(self, key_id: str) -> Optional[StoredKey]:
        """
        Get key by ID.
        
        Args:
            key_id: Key identifier
            
        Returns:
            StoredKey or None if not found
        """
        cursor = self.db.execute(
            "SELECT * FROM keys WHERE key_id = ?",
            (key_id,),
        )
        row = cursor.fetchone()
        return StoredKey.from_row(row) if row else None
    
    def get_active(self) -> Optional[StoredKey]:
        """
        Get the currently active key.
        
        Returns:
            Active StoredKey or None if no active key
        """
        cursor = self.db.execute(
            """
            SELECT * FROM keys 
            WHERE is_active = 1
            ORDER BY created_at DESC
            LIMIT 1
            """,
        )
        row = cursor.fetchone()
        return StoredKey.from_row(row) if row else None
    
    def activate(self, key_id: str) -> bool:
        """
        Activate a key (deactivates all others).
        
        Args:
            key_id: Key to activate
            
        Returns:
            True if activated, False if not found
        """
        # Deactivate all keys
        self.db.execute("UPDATE keys SET is_active = 0")
        
        # Activate specified key
        cursor = self.db.execute(
            "UPDATE keys SET is_active = 1 WHERE key_id = ?",
            (key_id,),
        )
        return cursor.rowcount > 0
    
    def deactivate(self, key_id: str) -> bool:
        """
        Deactivate a key.
        
        Args:
            key_id: Key to deactivate
            
        Returns:
            True if deactivated, False if not found
        """
        cursor = self.db.execute(
            "UPDATE keys SET is_active = 0 WHERE key_id = ?",
            (key_id,),
        )
        return cursor.rowcount > 0
    
    def list_all(self) -> List[StoredKey]:
        """
        List all keys.
        
        Returns:
            List of all keys
        """
        cursor = self.db.execute(
            "SELECT * FROM keys ORDER BY created_at DESC",
        )
        return [StoredKey.from_row(row) for row in cursor.fetchall()]
    
    def delete(self, key_id: str) -> bool:
        """
        Delete a key.
        
        Args:
            key_id: Key to delete
            
        Returns:
            True if deleted, False if not found
        """
        cursor = self.db.execute(
            "DELETE FROM keys WHERE key_id = ?",
            (key_id,),
        )
        return cursor.rowcount > 0
    
    def rotate(
        self,
        new_key_id: str,
        public_key_pem: str,
        private_key_pem: Optional[str] = None,
        algorithm: str = "RSA-4096-PSS-SHA256",
        expires_at: Optional[int] = None,
    ) -> StoredKey:
        """
        Rotate to a new key.
        
        Deactivates all existing keys and creates a new active key.
        
        Args:
            new_key_id: New key identifier
            public_key_pem: New public key
            private_key_pem: New private key
            algorithm: Key algorithm
            expires_at: Expiration timestamp
            
        Returns:
            New active StoredKey
        """
        # Deactivate all existing keys
        self.db.execute("UPDATE keys SET is_active = 0")
        
        # Create new active key
        return self.create(
            key_id=new_key_id,
            public_key_pem=public_key_pem,
            private_key_pem=private_key_pem,
            algorithm=algorithm,
            expires_at=expires_at,
        )

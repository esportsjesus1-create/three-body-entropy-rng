"""
Persistent commitment storage.

Provides SQLite-backed storage for commitments with
status tracking and expiration handling.
"""

import json
import time
from dataclasses import dataclass, field
from typing import Optional, List, Dict, Any

from .database import Database


@dataclass
class StoredCommitment:
    """
    A stored commitment record.
    
    Attributes:
        id: Database ID
        commitment_hash: SHA-256 hash
        server_seed: Server's random seed
        entropy_hex: Entropy from simulation
        nonce: Unique nonce
        timestamp_ms: Creation timestamp
        expires_ms: Expiration timestamp
        positions: Reel positions (JSON list)
        client_seed: Optional client seed
        status: pending, revealed, expired
        created_at: Database creation time
        revealed_at: Reveal timestamp
        chain_index: Position in hash chain
        previous_hash: Previous chain entry hash
    """
    id: int
    commitment_hash: str
    server_seed: str
    entropy_hex: str
    nonce: int
    timestamp_ms: int
    expires_ms: int
    positions: Optional[List[int]] = None
    client_seed: Optional[str] = None
    status: str = "pending"
    created_at: int = 0
    revealed_at: Optional[int] = None
    chain_index: Optional[int] = None
    previous_hash: Optional[str] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            "id": self.id,
            "commitment_hash": self.commitment_hash,
            "server_seed": self.server_seed,
            "entropy_hex": self.entropy_hex,
            "nonce": self.nonce,
            "timestamp_ms": self.timestamp_ms,
            "expires_ms": self.expires_ms,
            "positions": self.positions,
            "client_seed": self.client_seed,
            "status": self.status,
            "created_at": self.created_at,
            "revealed_at": self.revealed_at,
            "chain_index": self.chain_index,
            "previous_hash": self.previous_hash,
        }
    
    @classmethod
    def from_row(cls, row) -> "StoredCommitment":
        """Create from database row."""
        positions = json.loads(row["positions"]) if row["positions"] else None
        return cls(
            id=row["id"],
            commitment_hash=row["commitment_hash"],
            server_seed=row["server_seed"],
            entropy_hex=row["entropy_hex"],
            nonce=row["nonce"],
            timestamp_ms=row["timestamp_ms"],
            expires_ms=row["expires_ms"],
            positions=positions,
            client_seed=row["client_seed"],
            status=row["status"],
            created_at=row["created_at"],
            revealed_at=row["revealed_at"],
            chain_index=row["chain_index"],
            previous_hash=row["previous_hash"],
        )


class CommitmentStore:
    """
    SQLite-backed commitment storage.
    
    Provides CRUD operations for commitments with
    automatic expiration and status management.
    
    Example:
        >>> db = Database(DatabaseConfig(db_path=":memory:"))
        >>> db.initialize()
        >>> store = CommitmentStore(db)
        >>> store.create(
        ...     commitment_hash="abc123",
        ...     server_seed="def456",
        ...     entropy_hex="789abc",
        ...     nonce=1,
        ...     timestamp_ms=1000,
        ...     expires_ms=2000,
        ... )
    """
    
    def __init__(self, database: Database):
        """
        Initialize commitment store.
        
        Args:
            database: Database instance
        """
        self.db = database
    
    def create(
        self,
        commitment_hash: str,
        server_seed: str,
        entropy_hex: str,
        nonce: int,
        timestamp_ms: int,
        expires_ms: int,
        positions: Optional[List[int]] = None,
        client_seed: Optional[str] = None,
    ) -> StoredCommitment:
        """
        Create a new commitment.
        
        Args:
            commitment_hash: SHA-256 hash
            server_seed: Server's random seed
            entropy_hex: Entropy from simulation
            nonce: Unique nonce
            timestamp_ms: Creation timestamp
            expires_ms: Expiration timestamp
            positions: Optional reel positions
            client_seed: Optional client seed
            
        Returns:
            Created StoredCommitment
        """
        created_at = int(time.time() * 1000)
        positions_json = json.dumps(positions) if positions else None
        
        cursor = self.db.execute(
            """
            INSERT INTO commitments (
                commitment_hash, server_seed, entropy_hex, nonce,
                timestamp_ms, expires_ms, positions, client_seed,
                status, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)
            """,
            (
                commitment_hash, server_seed, entropy_hex, nonce,
                timestamp_ms, expires_ms, positions_json, client_seed,
                created_at,
            ),
        )
        
        return StoredCommitment(
            id=cursor.lastrowid,
            commitment_hash=commitment_hash,
            server_seed=server_seed,
            entropy_hex=entropy_hex,
            nonce=nonce,
            timestamp_ms=timestamp_ms,
            expires_ms=expires_ms,
            positions=positions,
            client_seed=client_seed,
            status="pending",
            created_at=created_at,
        )
    
    def get(self, commitment_hash: str) -> Optional[StoredCommitment]:
        """
        Get commitment by hash.
        
        Args:
            commitment_hash: Commitment hash to find
            
        Returns:
            StoredCommitment or None if not found
        """
        cursor = self.db.execute(
            "SELECT * FROM commitments WHERE commitment_hash = ?",
            (commitment_hash,),
        )
        row = cursor.fetchone()
        return StoredCommitment.from_row(row) if row else None
    
    def get_by_id(self, id: int) -> Optional[StoredCommitment]:
        """
        Get commitment by ID.
        
        Args:
            id: Database ID
            
        Returns:
            StoredCommitment or None if not found
        """
        cursor = self.db.execute(
            "SELECT * FROM commitments WHERE id = ?",
            (id,),
        )
        row = cursor.fetchone()
        return StoredCommitment.from_row(row) if row else None
    
    def mark_revealed(self, commitment_hash: str) -> bool:
        """
        Mark commitment as revealed.
        
        Args:
            commitment_hash: Commitment hash
            
        Returns:
            True if updated, False if not found
        """
        revealed_at = int(time.time() * 1000)
        cursor = self.db.execute(
            """
            UPDATE commitments 
            SET status = 'revealed', revealed_at = ?
            WHERE commitment_hash = ? AND status = 'pending'
            """,
            (revealed_at, commitment_hash),
        )
        return cursor.rowcount > 0
    
    def mark_expired(self, commitment_hash: str) -> bool:
        """
        Mark commitment as expired.
        
        Args:
            commitment_hash: Commitment hash
            
        Returns:
            True if updated, False if not found
        """
        cursor = self.db.execute(
            """
            UPDATE commitments 
            SET status = 'expired'
            WHERE commitment_hash = ? AND status = 'pending'
            """,
            (commitment_hash,),
        )
        return cursor.rowcount > 0
    
    def expire_old_commitments(self) -> int:
        """
        Expire all old pending commitments.
        
        Returns:
            Number of commitments expired
        """
        current_time = int(time.time() * 1000)
        cursor = self.db.execute(
            """
            UPDATE commitments 
            SET status = 'expired'
            WHERE status = 'pending' AND expires_ms < ?
            """,
            (current_time,),
        )
        return cursor.rowcount
    
    def list_pending(self, limit: int = 100) -> List[StoredCommitment]:
        """
        List pending commitments.
        
        Args:
            limit: Maximum number to return
            
        Returns:
            List of pending commitments
        """
        cursor = self.db.execute(
            """
            SELECT * FROM commitments 
            WHERE status = 'pending'
            ORDER BY timestamp_ms DESC
            LIMIT ?
            """,
            (limit,),
        )
        return [StoredCommitment.from_row(row) for row in cursor.fetchall()]
    
    def list_recent(self, limit: int = 100) -> List[StoredCommitment]:
        """
        List recent commitments (any status).
        
        Args:
            limit: Maximum number to return
            
        Returns:
            List of recent commitments
        """
        cursor = self.db.execute(
            """
            SELECT * FROM commitments 
            ORDER BY timestamp_ms DESC
            LIMIT ?
            """,
            (limit,),
        )
        return [StoredCommitment.from_row(row) for row in cursor.fetchall()]
    
    def count_by_status(self) -> Dict[str, int]:
        """
        Count commitments by status.
        
        Returns:
            Dictionary of status -> count
        """
        cursor = self.db.execute(
            """
            SELECT status, COUNT(*) as count
            FROM commitments
            GROUP BY status
            """,
        )
        return {row["status"]: row["count"] for row in cursor.fetchall()}
    
    def delete(self, commitment_hash: str) -> bool:
        """
        Delete a commitment.
        
        Args:
            commitment_hash: Commitment hash
            
        Returns:
            True if deleted, False if not found
        """
        cursor = self.db.execute(
            "DELETE FROM commitments WHERE commitment_hash = ?",
            (commitment_hash,),
        )
        return cursor.rowcount > 0

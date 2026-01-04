"""
Audit log for tracking all RNG operations.

Provides an append-only log with hash chain integrity.
"""

import json
import time
import hashlib
from dataclasses import dataclass
from typing import Optional, List, Dict, Any
from enum import Enum

from .database import Database


class AuditAction(str, Enum):
    """Audit action types."""
    COMMIT_CREATED = "commit_created"
    COMMIT_REVEALED = "commit_revealed"
    COMMIT_EXPIRED = "commit_expired"
    COMMIT_VERIFIED = "commit_verified"
    KEY_CREATED = "key_created"
    KEY_ROTATED = "key_rotated"
    KEY_DEACTIVATED = "key_deactivated"
    RATE_LIMIT_EXCEEDED = "rate_limit_exceeded"
    VERIFICATION_FAILED = "verification_failed"
    ERROR = "error"


@dataclass
class AuditEntry:
    """
    An audit log entry.
    
    Attributes:
        id: Database ID
        timestamp_ms: Entry timestamp
        action: Action type
        commitment_hash: Related commitment hash
        client_ip: Client IP address
        details: Additional details (JSON)
        entry_hash: Hash of this entry
        previous_hash: Hash of previous entry
    """
    id: int
    timestamp_ms: int
    action: str
    commitment_hash: Optional[str]
    client_ip: Optional[str]
    details: Optional[Dict[str, Any]]
    entry_hash: str
    previous_hash: Optional[str]
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            "id": self.id,
            "timestamp_ms": self.timestamp_ms,
            "action": self.action,
            "commitment_hash": self.commitment_hash,
            "client_ip": self.client_ip,
            "details": self.details,
            "entry_hash": self.entry_hash,
            "previous_hash": self.previous_hash,
        }
    
    @classmethod
    def from_row(cls, row) -> "AuditEntry":
        """Create from database row."""
        details = json.loads(row["details"]) if row["details"] else None
        return cls(
            id=row["id"],
            timestamp_ms=row["timestamp_ms"],
            action=row["action"],
            commitment_hash=row["commitment_hash"],
            client_ip=row["client_ip"],
            details=details,
            entry_hash=row["entry_hash"],
            previous_hash=row["previous_hash"],
        )


def compute_entry_hash(
    timestamp_ms: int,
    action: str,
    commitment_hash: Optional[str],
    details: Optional[str],
    previous_hash: Optional[str],
) -> str:
    """
    Compute hash for audit entry.
    
    Args:
        timestamp_ms: Entry timestamp
        action: Action type
        commitment_hash: Related commitment
        details: JSON details
        previous_hash: Previous entry hash
        
    Returns:
        SHA-256 hash
    """
    parts = [
        str(timestamp_ms),
        action,
        commitment_hash or "",
        details or "",
        previous_hash or "",
    ]
    data = "|".join(parts)
    return hashlib.sha256(data.encode('utf-8')).hexdigest()


class AuditLog:
    """
    SQLite-backed audit log with hash chain.
    
    Provides append-only logging with integrity verification.
    
    Example:
        >>> db = Database(DatabaseConfig(db_path=":memory:"))
        >>> db.initialize()
        >>> log = AuditLog(db)
        >>> log.append(
        ...     action=AuditAction.COMMIT_CREATED,
        ...     commitment_hash="abc123",
        ... )
    """
    
    def __init__(self, database: Database):
        """
        Initialize audit log.
        
        Args:
            database: Database instance
        """
        self.db = database
    
    def _get_latest_hash(self) -> Optional[str]:
        """Get hash of latest entry."""
        cursor = self.db.execute(
            """
            SELECT entry_hash FROM audit_log 
            ORDER BY id DESC LIMIT 1
            """,
        )
        row = cursor.fetchone()
        return row["entry_hash"] if row else None
    
    def append(
        self,
        action: AuditAction,
        commitment_hash: Optional[str] = None,
        client_ip: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
    ) -> AuditEntry:
        """
        Append entry to audit log.
        
        Args:
            action: Action type
            commitment_hash: Related commitment
            client_ip: Client IP address
            details: Additional details
            
        Returns:
            Created AuditEntry
        """
        timestamp_ms = int(time.time() * 1000)
        details_json = json.dumps(details) if details else None
        previous_hash = self._get_latest_hash()
        
        entry_hash = compute_entry_hash(
            timestamp_ms=timestamp_ms,
            action=action.value if isinstance(action, AuditAction) else action,
            commitment_hash=commitment_hash,
            details=details_json,
            previous_hash=previous_hash,
        )
        
        action_value = action.value if isinstance(action, AuditAction) else action
        
        cursor = self.db.execute(
            """
            INSERT INTO audit_log (
                timestamp_ms, action, commitment_hash, client_ip,
                details, entry_hash, previous_hash
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                timestamp_ms, action_value, commitment_hash, client_ip,
                details_json, entry_hash, previous_hash,
            ),
        )
        
        return AuditEntry(
            id=cursor.lastrowid,
            timestamp_ms=timestamp_ms,
            action=action_value,
            commitment_hash=commitment_hash,
            client_ip=client_ip,
            details=details,
            entry_hash=entry_hash,
            previous_hash=previous_hash,
        )
    
    def get(self, id: int) -> Optional[AuditEntry]:
        """
        Get entry by ID.
        
        Args:
            id: Entry ID
            
        Returns:
            AuditEntry or None
        """
        cursor = self.db.execute(
            "SELECT * FROM audit_log WHERE id = ?",
            (id,),
        )
        row = cursor.fetchone()
        return AuditEntry.from_row(row) if row else None
    
    def list_recent(self, limit: int = 100) -> List[AuditEntry]:
        """
        List recent entries.
        
        Args:
            limit: Maximum entries to return
            
        Returns:
            List of recent entries
        """
        cursor = self.db.execute(
            """
            SELECT * FROM audit_log 
            ORDER BY id DESC LIMIT ?
            """,
            (limit,),
        )
        return [AuditEntry.from_row(row) for row in cursor.fetchall()]
    
    def list_by_action(
        self,
        action: AuditAction,
        limit: int = 100,
    ) -> List[AuditEntry]:
        """
        List entries by action type.
        
        Args:
            action: Action type to filter
            limit: Maximum entries
            
        Returns:
            List of matching entries
        """
        action_value = action.value if isinstance(action, AuditAction) else action
        cursor = self.db.execute(
            """
            SELECT * FROM audit_log 
            WHERE action = ?
            ORDER BY id DESC LIMIT ?
            """,
            (action_value, limit),
        )
        return [AuditEntry.from_row(row) for row in cursor.fetchall()]
    
    def list_by_commitment(
        self,
        commitment_hash: str,
    ) -> List[AuditEntry]:
        """
        List entries for a commitment.
        
        Args:
            commitment_hash: Commitment hash
            
        Returns:
            List of related entries
        """
        cursor = self.db.execute(
            """
            SELECT * FROM audit_log 
            WHERE commitment_hash = ?
            ORDER BY id ASC
            """,
            (commitment_hash,),
        )
        return [AuditEntry.from_row(row) for row in cursor.fetchall()]
    
    def verify_chain(self) -> bool:
        """
        Verify hash chain integrity.
        
        Returns:
            True if chain is valid, False if tampered
        """
        cursor = self.db.execute(
            "SELECT * FROM audit_log ORDER BY id ASC",
        )
        
        previous_hash = None
        for row in cursor.fetchall():
            # Check previous hash matches
            if row["previous_hash"] != previous_hash:
                return False
            
            # Recompute entry hash
            expected_hash = compute_entry_hash(
                timestamp_ms=row["timestamp_ms"],
                action=row["action"],
                commitment_hash=row["commitment_hash"],
                details=row["details"],
                previous_hash=row["previous_hash"],
            )
            
            if row["entry_hash"] != expected_hash:
                return False
            
            previous_hash = row["entry_hash"]
        
        return True
    
    def count(self) -> int:
        """
        Count total entries.
        
        Returns:
            Total entry count
        """
        cursor = self.db.execute("SELECT COUNT(*) as count FROM audit_log")
        return cursor.fetchone()["count"]
    
    def count_by_action(self) -> Dict[str, int]:
        """
        Count entries by action.
        
        Returns:
            Dictionary of action -> count
        """
        cursor = self.db.execute(
            """
            SELECT action, COUNT(*) as count
            FROM audit_log
            GROUP BY action
            """,
        )
        return {row["action"]: row["count"] for row in cursor.fetchall()}
    
    def detect_sequence_gaps(self) -> Dict[str, Any]:
        """
        Detect gaps in commitment sequence.
        
        Analyzes the audit log to find commitments that were created
        but never revealed or expired. This helps detect if an operator
        is selectively hiding unfavorable outcomes.
        
        Returns:
            Dictionary with:
                - total_created: Total commitments created
                - total_revealed: Total commitments revealed
                - total_expired: Total commitments expired
                - missing_count: Commitments with no reveal/expire
                - missing_hashes: List of commitment hashes with no outcome
                - gap_detected: True if gaps found
        """
        # Count by action type
        action_counts = self.count_by_action()
        
        total_created = action_counts.get(AuditAction.COMMIT_CREATED.value, 0)
        total_revealed = action_counts.get(AuditAction.COMMIT_REVEALED.value, 0)
        total_expired = action_counts.get(AuditAction.COMMIT_EXPIRED.value, 0)
        
        # Find commitments that were created but have no reveal/expire
        cursor = self.db.execute(
            """
            SELECT DISTINCT commitment_hash FROM audit_log 
            WHERE action = ? AND commitment_hash IS NOT NULL
            """,
            (AuditAction.COMMIT_CREATED.value,),
        )
        created_hashes = {row["commitment_hash"] for row in cursor.fetchall()}
        
        cursor = self.db.execute(
            """
            SELECT DISTINCT commitment_hash FROM audit_log 
            WHERE action IN (?, ?) AND commitment_hash IS NOT NULL
            """,
            (AuditAction.COMMIT_REVEALED.value, AuditAction.COMMIT_EXPIRED.value),
        )
        resolved_hashes = {row["commitment_hash"] for row in cursor.fetchall()}
        
        missing_hashes = list(created_hashes - resolved_hashes)
        missing_count = len(missing_hashes)
        
        return {
            "total_created": total_created,
            "total_revealed": total_revealed,
            "total_expired": total_expired,
            "missing_count": missing_count,
            "missing_hashes": missing_hashes[:100],  # Limit to first 100
            "gap_detected": missing_count > 0,
        }
    
    def get_commitment_lifecycle(self, commitment_hash: str) -> Dict[str, Any]:
        """
        Get full lifecycle of a commitment.
        
        Returns all audit entries for a commitment, showing
        its complete history from creation to resolution.
        
        Args:
            commitment_hash: Commitment hash to trace
            
        Returns:
            Dictionary with:
                - commitment_hash: The commitment hash
                - entries: List of audit entries
                - status: Current status (pending/revealed/expired/unknown)
                - created_at: Creation timestamp
                - resolved_at: Resolution timestamp (if any)
        """
        entries = self.list_by_commitment(commitment_hash)
        
        if not entries:
            return {
                "commitment_hash": commitment_hash,
                "entries": [],
                "status": "unknown",
                "created_at": None,
                "resolved_at": None,
            }
        
        status = "pending"
        created_at = None
        resolved_at = None
        
        for entry in entries:
            if entry.action == AuditAction.COMMIT_CREATED.value:
                created_at = entry.timestamp_ms
            elif entry.action == AuditAction.COMMIT_REVEALED.value:
                status = "revealed"
                resolved_at = entry.timestamp_ms
            elif entry.action == AuditAction.COMMIT_EXPIRED.value:
                status = "expired"
                resolved_at = entry.timestamp_ms
        
        return {
            "commitment_hash": commitment_hash,
            "entries": [e.to_dict() for e in entries],
            "status": status,
            "created_at": created_at,
            "resolved_at": resolved_at,
        }
    
    def audit_summary(self) -> Dict[str, Any]:
        """
        Generate comprehensive audit summary.
        
        Returns:
            Dictionary with:
                - total_entries: Total audit log entries
                - action_counts: Counts by action type
                - chain_valid: Whether hash chain is intact
                - sequence_gaps: Gap detection results
                - oldest_entry: Timestamp of oldest entry
                - newest_entry: Timestamp of newest entry
        """
        total = self.count()
        action_counts = self.count_by_action()
        chain_valid = self.verify_chain()
        gaps = self.detect_sequence_gaps()
        
        # Get timestamp range
        cursor = self.db.execute(
            "SELECT MIN(timestamp_ms) as oldest, MAX(timestamp_ms) as newest FROM audit_log"
        )
        row = cursor.fetchone()
        oldest = row["oldest"] if row else None
        newest = row["newest"] if row else None
        
        return {
            "total_entries": total,
            "action_counts": action_counts,
            "chain_valid": chain_valid,
            "sequence_gaps": gaps,
            "oldest_entry_ms": oldest,
            "newest_entry_ms": newest,
        }

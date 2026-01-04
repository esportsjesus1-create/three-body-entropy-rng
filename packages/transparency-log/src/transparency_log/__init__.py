"""
Transparency Log - SQLite-backed audit trail for Three-Body RNG

This module provides persistent storage for commitments, reveals,
and RSA keys using SQLite. It ensures data survives server restarts
and provides an auditable history of all RNG operations.

Key Features:
- SQLite persistence for commitments and reveals
- RSA key storage with backup/rotation support
- Hash chain integrity verification
- Audit trail queries
"""

from .database import Database, DatabaseConfig
from .commitment_store import CommitmentStore, StoredCommitment
from .key_store import KeyStore, StoredKey
from .audit_log import AuditLog, AuditEntry, AuditAction

__all__ = [
    "Database",
    "DatabaseConfig",
    "CommitmentStore",
    "StoredCommitment",
    "KeyStore",
    "StoredKey",
    "AuditLog",
    "AuditEntry",
    "AuditAction",
]

__version__ = "1.0.0"

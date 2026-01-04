# Transparency Log

SQLite-backed audit trail for Three-Body RNG commitments. Provides persistent storage for commitments, RSA keys, and audit logs with hash chain integrity verification.

## Features

- **Commitment Storage**: Persistent storage with status tracking and expiration
- **Key Storage**: RSA key persistence with rotation support
- **Audit Log**: Append-only log with hash chain integrity
- **SQLite Backend**: Lightweight, file-based persistence

## Installation

```bash
cd packages/transparency-log
poetry install
```

## Quick Start

### Database Setup

```python
from transparency_log import Database, DatabaseConfig

# Create database (file-based)
db = Database(DatabaseConfig(db_path="transparency.db"))
db.initialize()

# Or in-memory for testing
db = Database(DatabaseConfig(db_path=":memory:"))
db.initialize()
```

### Commitment Storage

```python
from transparency_log import CommitmentStore

store = CommitmentStore(db)

# Create commitment
commitment = store.create(
    commitment_hash="abc123...",
    server_seed="def456...",
    entropy_hex="789abc...",
    nonce=1,
    timestamp_ms=1704384000000,
    expires_ms=1704384300000,
    positions=[3, 7, 2, 5, 1],
)

# Get commitment
commitment = store.get("abc123...")

# Mark as revealed
store.mark_revealed("abc123...")

# Expire old commitments
expired_count = store.expire_old_commitments()
```

### Key Storage

```python
from transparency_log import KeyStore

key_store = KeyStore(db)

# Create key
key = key_store.create(
    key_id="key-001",
    public_key_pem="-----BEGIN PUBLIC KEY-----...",
    private_key_pem="-----BEGIN PRIVATE KEY-----...",
    algorithm="RSA-4096-PSS-SHA256",
)

# Get active key
active_key = key_store.get_active()

# Rotate keys
new_key = key_store.rotate(
    new_key_id="key-002",
    public_key_pem="-----BEGIN PUBLIC KEY-----...",
    private_key_pem="-----BEGIN PRIVATE KEY-----...",
)
```

### Audit Log

```python
from transparency_log import AuditLog, AuditAction

audit = AuditLog(db)

# Log events
audit.append(
    action=AuditAction.COMMIT_CREATED,
    commitment_hash="abc123...",
    client_ip="192.168.1.1",
    details={"num_reels": 5},
)

# Verify chain integrity
is_valid = audit.verify_chain()

# List entries for a commitment
entries = audit.list_by_commitment("abc123...")
```

## API Reference

### Database

```python
class Database:
    def initialize(self) -> None
    def execute(self, sql: str, params: tuple = ()) -> Cursor
    def connection(self) -> ContextManager[Connection]
    def close(self) -> None
```

### CommitmentStore

```python
class CommitmentStore:
    def create(...) -> StoredCommitment
    def get(commitment_hash: str) -> Optional[StoredCommitment]
    def mark_revealed(commitment_hash: str) -> bool
    def mark_expired(commitment_hash: str) -> bool
    def expire_old_commitments() -> int
    def list_pending(limit: int = 100) -> List[StoredCommitment]
    def count_by_status() -> Dict[str, int]
```

### KeyStore

```python
class KeyStore:
    def create(...) -> StoredKey
    def get(key_id: str) -> Optional[StoredKey]
    def get_active() -> Optional[StoredKey]
    def activate(key_id: str) -> bool
    def rotate(...) -> StoredKey
```

### AuditLog

```python
class AuditLog:
    def append(action: AuditAction, ...) -> AuditEntry
    def get(id: int) -> Optional[AuditEntry]
    def list_recent(limit: int = 100) -> List[AuditEntry]
    def list_by_commitment(hash: str) -> List[AuditEntry]
    def verify_chain() -> bool
    def count_by_action() -> Dict[str, int]
```

## Security Considerations

- **Key Storage**: Private keys stored in SQLite should be encrypted at rest in production. Consider using KMS or envelope encryption.
- **Hash Chain**: Provides tamper detection but not prevention. Regular backups recommended.
- **Audit Log**: Append-only design prevents modification of history.

## Testing

```bash
# Run tests with coverage
poetry run pytest

# Run specific test file
poetry run pytest tests/test_commitment_store.py -v

# Check coverage report
poetry run pytest --cov-report=html
```

## License

MIT

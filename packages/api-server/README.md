# API Server

FastAPI server for Three-Body RNG with rate limiting and health checks.

## Features

- **Commit/Reveal Endpoints**: Provably fair RNG protocol
- **Rate Limiting**: Token bucket algorithm with per-IP limits
- **Health Checks**: Kubernetes-compatible health endpoints
- **OpenAPI Documentation**: Auto-generated API docs
- **CORS Support**: Cross-origin resource sharing

## Installation

```bash
cd packages/api-server
poetry install
```

## Quick Start

### Running the Server

```python
from api_server import create_app
import uvicorn

app = create_app()
uvicorn.run(app, host="0.0.0.0", port=8000)
```

Or via command line:
```bash
poetry run uvicorn api_server.app:create_app --factory --host 0.0.0.0 --port 8000
```

### API Endpoints

#### POST /commit
Create a new commitment before player input.

```bash
curl -X POST http://localhost:8000/commit \
  -H "Content-Type: application/json" \
  -d '{"num_reels": 5}'
```

Response:
```json
{
  "commitment_hash": "abc123...",
  "timestamp_ms": 1704384000000,
  "nonce": 12345,
  "expires_ms": 1704384300000
}
```

#### POST /reveal
Reveal commitment after player input.

```bash
curl -X POST http://localhost:8000/reveal \
  -H "Content-Type: application/json" \
  -d '{"commitment_hash": "abc123..."}'
```

Response:
```json
{
  "commitment_hash": "abc123...",
  "server_seed": "def456...",
  "entropy_hex": "789abc...",
  "positions": [3, 7, 2, 5, 1],
  "nonce": 12345,
  "timestamp_ms": 1704384000000,
  "verified": true
}
```

#### POST /verify
Independently verify a commitment.

```bash
curl -X POST http://localhost:8000/verify \
  -H "Content-Type: application/json" \
  -d '{
    "commitment_hash": "abc123...",
    "server_seed": "def456...",
    "entropy_hex": "789abc...",
    "nonce": 12345,
    "timestamp_ms": 1704384000000,
    "positions": [3, 7, 2, 5, 1]
  }'
```

#### GET /health
Health check with component status.

#### GET /healthz
Kubernetes-style liveness probe.

#### GET /public-key
Get server's RSA public key for signature verification.

## Configuration

### Rate Limiting

```python
from api_server import create_app
from api_server.rate_limiter import RateLimitConfig

app = create_app(
    rate_limit_config=RateLimitConfig(
        requests_per_second=10.0,  # Refill rate
        burst_size=20,             # Max burst
        cleanup_interval=60.0,     # Cleanup old entries
    ),
    commitment_expiry_ms=300000,   # 5 minutes
)
```

### Health Checks

```python
from api_server.health import HealthChecker, HealthState

checker = app.state.health_checker
checker.register_component("database")
checker.update_component("database", HealthState.HEALTHY)
```

## API Reference

### RateLimiter

```python
class RateLimiter:
    def check(self, client_id: str) -> None
    def get_remaining(self, client_id: str) -> int
    def reset(self, client_id: str) -> None
```

### HealthChecker

```python
class HealthChecker:
    def register_component(self, name: str) -> None
    def update_component(self, name: str, state: HealthState, ...) -> None
    def get_status(self) -> HealthStatus
    def is_healthy(self) -> bool
```

## Rate Limit Headers

All responses include rate limit headers:
- `X-RateLimit-Remaining`: Remaining requests in current window

When rate limited (429 response):
- `Retry-After`: Seconds to wait before retry

## Security Considerations

- **Rate Limiting**: Prevents DoS and abuse
- **Commitment Expiry**: Prevents timing attacks
- **Single-Use Reveals**: Each commitment can only be revealed once
- **CORS**: Configure allowed origins for production

## Integration with Other Modules

For production use, integrate with:
- `crypto-service`: RSA signatures and HKDF entropy
- `physics-engine`: Three-body simulation for entropy
- `commitment-protocol`: Full commit/reveal protocol
- `transparency-log`: SQLite persistence

## Testing

```bash
# Run tests with coverage
poetry run pytest

# Run specific test file
poetry run pytest tests/test_app.py -v

# Check coverage report
poetry run pytest --cov-report=html
```

## License

MIT

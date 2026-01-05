# Japanese Omakase Three-Body Entropy Slot Machine

A fully functional, provably fair slot machine demo that uses three-body gravitational dynamics for cryptographically secure random number generation.

## Live Demo

**Play Now:** https://japanese-omakase-slot-app-72b5gtsy.devinapps.com

**Backend API:** https://app-flobtqju.fly.dev

## Features

- **Japanese Omakase Theme**: 9 authentic Japanese cuisine symbols (Sushi, Sashimi, Tempura, Ramen, Sake, Chopsticks, Tea, Wild Chef, Scatter)
- **Three-Body Entropy RNG**: Uses chaotic three-body gravitational physics for true randomness
- **Real-time Visualization**: Watch the three-body simulation that generates your spin's entropy
- **Provably Fair**: Every spin includes cryptographic proofs that can be independently verified
- **HKDF Key Derivation**: RFC 5869 compliant seed mixing for cryptographic security

## How It Works

### Three-Body Physics Simulation

The slot machine uses a three-body gravitational simulation to generate entropy. The three-body problem is inherently chaotic - tiny changes in initial conditions lead to dramatically different outcomes, making it an excellent source of unpredictable randomness.

1. **Initialization**: Each spin initializes three celestial bodies with positions derived from a SHA-256 hash of the server seed
2. **RK4 Integration**: The simulation runs using 4th-order Runge-Kutta numerical integration
3. **Entropy Extraction**: Final body positions are hashed to produce cryptographically secure random values
4. **Reel Determination**: The entropy is combined with client seed using HKDF to determine reel stops

### Provably Fair System

Every spin uses a commit-reveal scheme:

1. **Server Commitment**: Before the spin, the server commits to a seed by publishing its SHA-256 hash
2. **Client Seed**: The player can provide their own seed (or one is generated)
3. **Combined Seed**: Server and client seeds are mixed using HKDF (RFC 5869)
4. **Verification**: After the spin, all seeds are revealed so players can verify the outcome

### Verification Bundle

Each spin generates a verification bundle containing:
- Spin ID and timestamp
- Server seed (revealed after spin)
- Client seed
- Nonce
- Commitment hash (SHA-256 of server seed)
- Combined seed (HKDF output)
- Reel stops
- Three-body initial conditions and final state
- Theta values from simulation

## Architecture

```
japanese-omakase-demo/
├── japanese-omakase-backend/     # FastAPI backend
│   ├── app/
│   │   └── main.py              # API endpoints + three-body simulation
│   └── pyproject.toml           # Python dependencies
└── japanese-omakase-frontend/    # React frontend
    ├── src/
    │   └── App.tsx              # Slot machine UI + visualization
    └── package.json             # Node dependencies
```

### Backend (FastAPI)

- **Three-Body Simulation**: Full RK4 integration with configurable parameters
- **HKDF Implementation**: RFC 5869 compliant key derivation
- **Slot Machine Logic**: Symbol mapping, win calculation, payout multipliers
- **API Endpoints**:
  - `POST /api/spin` - Execute a spin with three-body entropy
  - `GET /api/verify/{spin_id}` - Get verification bundle for a spin
  - `GET /api/simulation/{spin_id}` - Get three-body state for a spin
  - `GET /api/symbols` - Get available symbols and payouts

### Frontend (React + Vite)

- **Slot Machine UI**: 5-reel display with spinning animation
- **Three-Body Visualization**: Canvas-based real-time rendering of body positions
- **Verification UI**: Display and download cryptographic proof bundles
- **Responsive Design**: Works on desktop and mobile

## Symbol Payouts

| Symbol | Emoji | Multiplier |
|--------|-------|------------|
| Sushi | 🍣 | 100x |
| Sashimi | 🍱 | 80x |
| Tempura | 🍤 | 60x |
| Ramen | 🍜 | 40x |
| Sake | 🍶 | 30x |
| Chopsticks | 🥢 | 20x |
| Tea | 🍵 | 15x |
| Wild (Chef) | 👨‍🍳 | Substitutes any |
| Scatter | 🏮 | Bonus trigger |

## Local Development

### Backend

```bash
cd japanese-omakase-backend
poetry install
poetry run fastapi dev app/main.py
```

### Frontend

```bash
cd japanese-omakase-frontend
npm install
npm run dev
```

## API Reference

### POST /api/spin

Execute a slot spin using three-body entropy.

**Request Body:**
```json
{
  "bet": 10,
  "client_seed": "optional-custom-seed"
}
```

**Response:**
```json
{
  "spin_id": "spin_abc123",
  "timestamp": "2026-01-05T03:25:01.814658Z",
  "reel_stops": [1, 2, 2, 3, 8],
  "symbols": [{"name": "Sashimi", "emoji": "🍱"}, ...],
  "bet": 10,
  "win_amount": 0,
  "win_type": "no_win",
  "commitment_hash": "d74073e1...",
  "server_seed_hash": "d74073e1...",
  "client_seed": "ef59950b...",
  "nonce": 650083,
  "combined_seed_hex": "2ba7ec95...",
  "three_body_state": {
    "initial": { "bodies": [...] },
    "final": { "bodies": [...], "entropy": {...} }
  },
  "theta_values": [...]
}
```

### GET /api/verify/{spin_id}

Get the full verification bundle for a spin.

**Response:**
```json
{
  "spin_id": "spin_abc123",
  "timestamp": "2026-01-05T03:25:01.814658Z",
  "server_seed": "52e8381571b08c48...",
  "client_seed": "ef59950bc19f9c8e...",
  "nonce": 650083,
  "commitment_hash": "d74073e1...",
  "combined_seed_hex": "2ba7ec95...",
  "reel_stops": [1, 2, 2, 3, 8],
  "symbols": ["Sashimi", "Tempura", ...],
  "win_amount": 0,
  "three_body_initial_conditions": {...},
  "three_body_final_state": {...},
  "theta_values": [...]
}
```

## Technologies Used

- **Backend**: Python, FastAPI, Poetry
- **Frontend**: React, TypeScript, Vite, Tailwind CSS, shadcn/ui
- **Deployment**: Fly.io (backend), Devin Apps (frontend)
- **Cryptography**: SHA-256, HKDF (RFC 5869)
- **Physics**: RK4 numerical integration, three-body gravitational dynamics

## License

MIT License - See the main repository for details.

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import hashlib
import hmac
import secrets
import math
import uuid
from datetime import datetime

app = FastAPI(title="Japanese Omakase Three-Body Entropy Slot Machine")

# Disable CORS. Do not remove this for full-stack development.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

# In-memory storage for spins and sessions
spin_storage: dict = {}
session_storage: dict = {}

# Japanese Omakase themed symbols
SYMBOLS = [
    {"id": 0, "name": "Sushi", "emoji": "🍣", "value": 100},
    {"id": 1, "name": "Sashimi", "emoji": "🍱", "value": 80},
    {"id": 2, "name": "Tempura", "emoji": "🍤", "value": 60},
    {"id": 3, "name": "Ramen", "emoji": "🍜", "value": 40},
    {"id": 4, "name": "Sake", "emoji": "🍶", "value": 30},
    {"id": 5, "name": "Chopsticks", "emoji": "🥢", "value": 20},
    {"id": 6, "name": "Tea", "emoji": "🍵", "value": 15},
    {"id": 7, "name": "Wild", "emoji": "👨‍🍳", "value": 0},  # Chef as Wild
    {"id": 8, "name": "Scatter", "emoji": "🏮", "value": 0},  # Lantern as Scatter
]

# Three-Body Physics Simulation
class Vector3D:
    def __init__(self, x: float, y: float, z: float):
        self.x = x
        self.y = y
        self.z = z
    
    def add(self, other: 'Vector3D') -> 'Vector3D':
        return Vector3D(self.x + other.x, self.y + other.y, self.z + other.z)
    
    def subtract(self, other: 'Vector3D') -> 'Vector3D':
        return Vector3D(self.x - other.x, self.y - other.y, self.z - other.z)
    
    def scale(self, scalar: float) -> 'Vector3D':
        return Vector3D(self.x * scalar, self.y * scalar, self.z * scalar)
    
    def magnitude(self) -> float:
        return math.sqrt(self.x**2 + self.y**2 + self.z**2)
    
    def to_dict(self) -> dict:
        return {"x": self.x, "y": self.y, "z": self.z}


class Body:
    def __init__(self, mass: float, position: Vector3D, velocity: Vector3D):
        self.mass = mass
        self.position = position
        self.velocity = velocity
    
    def to_dict(self) -> dict:
        return {
            "mass": self.mass,
            "position": self.position.to_dict(),
            "velocity": self.velocity.to_dict()
        }


class ThreeBodySimulation:
    def __init__(self, gravitational_constant: float = 1.0, softening: float = 0.01):
        self.G = gravitational_constant
        self.softening = softening
        self.bodies: list[Body] = []
        self.time = 0.0
        self.history: list = []
    
    def initialize_figure_eight(self):
        """Initialize with figure-eight orbit initial conditions"""
        # Classic figure-eight solution
        self.bodies = [
            Body(1.0, Vector3D(-0.97000436, 0.24308753, 0), 
                 Vector3D(0.4662036850, 0.4323657300, 0)),
            Body(1.0, Vector3D(0.97000436, -0.24308753, 0), 
                 Vector3D(0.4662036850, 0.4323657300, 0)),
            Body(1.0, Vector3D(0, 0, 0), 
                 Vector3D(-0.93240737, -0.86473146, 0))
        ]
        self.time = 0.0
        self.history = []
    
    def initialize_chaotic(self, seed: str):
        """Initialize with chaotic conditions based on seed"""
        # Use seed to generate deterministic but chaotic initial conditions
        seed_hash = hashlib.sha256(seed.encode()).hexdigest()
        
        def get_value(index: int, scale: float = 1.0) -> float:
            hex_chunk = seed_hash[index*4:(index+1)*4]
            value = int(hex_chunk, 16) / 65535.0  # Normalize to 0-1
            return (value - 0.5) * 2 * scale  # Scale to -scale to +scale
        
        self.bodies = [
            Body(1.0 + get_value(0, 0.5), 
                 Vector3D(get_value(1, 2), get_value(2, 2), get_value(3, 0.5)),
                 Vector3D(get_value(4, 0.5), get_value(5, 0.5), get_value(6, 0.1))),
            Body(1.0 + get_value(7, 0.5), 
                 Vector3D(get_value(8, 2), get_value(9, 2), get_value(10, 0.5)),
                 Vector3D(get_value(11, 0.5), get_value(12, 0.5), get_value(13, 0.1))),
            Body(1.0 + get_value(14, 0.5), 
                 Vector3D(-get_value(1, 2) - get_value(8, 2), 
                          -get_value(2, 2) - get_value(9, 2), 
                          -get_value(3, 0.5) - get_value(10, 0.5)),
                 Vector3D(-get_value(4, 0.5) - get_value(11, 0.5), 
                          -get_value(5, 0.5) - get_value(12, 0.5), 
                          -get_value(6, 0.1) - get_value(13, 0.1)))
        ]
        self.time = 0.0
        self.history = []
    
    def compute_acceleration(self, body_index: int) -> Vector3D:
        """Compute gravitational acceleration on a body"""
        acc = Vector3D(0, 0, 0)
        body = self.bodies[body_index]
        
        for i, other in enumerate(self.bodies):
            if i == body_index:
                continue
            
            r = other.position.subtract(body.position)
            dist = r.magnitude()
            dist_softened = math.sqrt(dist**2 + self.softening**2)
            
            force_magnitude = self.G * other.mass / (dist_softened**3)
            acc = acc.add(r.scale(force_magnitude))
        
        return acc
    
    def rk4_step(self, dt: float):
        """Perform one RK4 integration step"""
        n = len(self.bodies)
        
        # Store initial state
        pos0 = [Vector3D(b.position.x, b.position.y, b.position.z) for b in self.bodies]
        vel0 = [Vector3D(b.velocity.x, b.velocity.y, b.velocity.z) for b in self.bodies]
        
        # k1
        k1_v = [self.compute_acceleration(i) for i in range(n)]
        k1_r = [Vector3D(b.velocity.x, b.velocity.y, b.velocity.z) for b in self.bodies]
        
        # k2
        for i in range(n):
            self.bodies[i].position = pos0[i].add(k1_r[i].scale(dt/2))
            self.bodies[i].velocity = vel0[i].add(k1_v[i].scale(dt/2))
        k2_v = [self.compute_acceleration(i) for i in range(n)]
        k2_r = [Vector3D(b.velocity.x, b.velocity.y, b.velocity.z) for b in self.bodies]
        
        # k3
        for i in range(n):
            self.bodies[i].position = pos0[i].add(k2_r[i].scale(dt/2))
            self.bodies[i].velocity = vel0[i].add(k2_v[i].scale(dt/2))
        k3_v = [self.compute_acceleration(i) for i in range(n)]
        k3_r = [Vector3D(b.velocity.x, b.velocity.y, b.velocity.z) for b in self.bodies]
        
        # k4
        for i in range(n):
            self.bodies[i].position = pos0[i].add(k3_r[i].scale(dt))
            self.bodies[i].velocity = vel0[i].add(k3_v[i].scale(dt))
        k4_v = [self.compute_acceleration(i) for i in range(n)]
        k4_r = [Vector3D(b.velocity.x, b.velocity.y, b.velocity.z) for b in self.bodies]
        
        # Combine
        for i in range(n):
            dr = k1_r[i].add(k2_r[i].scale(2)).add(k3_r[i].scale(2)).add(k4_r[i]).scale(dt/6)
            dv = k1_v[i].add(k2_v[i].scale(2)).add(k3_v[i].scale(2)).add(k4_v[i]).scale(dt/6)
            self.bodies[i].position = pos0[i].add(dr)
            self.bodies[i].velocity = vel0[i].add(dv)
        
        self.time += dt
    
    def simulate(self, duration: float, dt: float = 0.001, record_interval: int = 10):
        """Run simulation for specified duration"""
        steps = int(duration / dt)
        for step in range(steps):
            self.rk4_step(dt)
            if step % record_interval == 0:
                self.history.append({
                    "time": self.time,
                    "bodies": [b.to_dict() for b in self.bodies]
                })
    
    def get_entropy_value(self) -> dict:
        """Extract entropy from final simulation state"""
        # Combine all position and velocity components
        state_string = ""
        for body in self.bodies:
            state_string += f"{body.position.x:.15f}{body.position.y:.15f}{body.position.z:.15f}"
            state_string += f"{body.velocity.x:.15f}{body.velocity.y:.15f}{body.velocity.z:.15f}"
        
        # Hash the state
        entropy_hex = hashlib.sha256(state_string.encode()).hexdigest()
        
        # Convert first 8 bytes to normalized value
        entropy_int = int(entropy_hex[:16], 16)
        entropy_value = entropy_int / (2**64 - 1)
        
        return {
            "hex": entropy_hex,
            "value": entropy_value,
            "state_hash": hashlib.sha256(state_string.encode()).hexdigest()
        }
    
    def get_theta_values(self) -> list[float]:
        """Extract theta (angle) values from body positions for visualization"""
        thetas = []
        for body in self.bodies:
            theta = math.atan2(body.position.y, body.position.x)
            thetas.append(theta)
        return thetas


# HKDF Implementation
def hkdf_extract(salt: bytes, ikm: bytes) -> bytes:
    """HKDF Extract step"""
    return hmac.new(salt, ikm, hashlib.sha256).digest()


def hkdf_expand(prk: bytes, info: bytes, length: int) -> bytes:
    """HKDF Expand step"""
    hash_len = 32  # SHA-256
    n = (length + hash_len - 1) // hash_len
    okm = b""
    t = b""
    for i in range(1, n + 1):
        t = hmac.new(prk, t + info + bytes([i]), hashlib.sha256).digest()
        okm += t
    return okm[:length]


def derive_combined_seed(server_seed: str, client_seed: str, nonce: int) -> str:
    """Derive combined seed using HKDF"""
    ikm = f"{server_seed}:{client_seed}:{nonce}".encode()
    salt = b"tb-entropy-v1"
    info = b"spin"
    
    prk = hkdf_extract(salt, ikm)
    okm = hkdf_expand(prk, info, 32)
    
    return okm.hex()


def derive_reel_stops(combined_seed_hex: str, reel_count: int = 5, symbols_per_reel: int = 9) -> list[int]:
    """Derive reel stops from combined seed"""
    stops = []
    bytes_per_reel = 4
    
    for i in range(reel_count):
        start = i * bytes_per_reel * 2
        end = start + bytes_per_reel * 2
        chunk = combined_seed_hex[start:end]
        value = int(chunk, 16)
        stop = value % symbols_per_reel
        stops.append(stop)
    
    return stops


def calculate_win(reel_stops: list[int], bet: int) -> dict:
    """Calculate win amount based on reel stops"""
    symbols = [SYMBOLS[stop] for stop in reel_stops]
    
    # Check for matching symbols (simplified payline - all 5 match)
    symbol_counts = {}
    for symbol in symbols:
        name = symbol["name"]
        if name not in symbol_counts:
            symbol_counts[name] = 0
        symbol_counts[name] += 1
    
    # Calculate win
    win_amount = 0
    win_type = None
    
    # Check for 5 of a kind
    for name, count in symbol_counts.items():
        if count == 5:
            symbol = next(s for s in SYMBOLS if s["name"] == name)
            win_amount = bet * symbol["value"]
            win_type = f"5x {name}"
            break
    
    # Check for 4 of a kind
    if win_amount == 0:
        for name, count in symbol_counts.items():
            if count == 4:
                symbol = next(s for s in SYMBOLS if s["name"] == name)
                win_amount = bet * symbol["value"] // 2
                win_type = f"4x {name}"
                break
    
    # Check for 3 of a kind
    if win_amount == 0:
        for name, count in symbol_counts.items():
            if count == 3:
                symbol = next(s for s in SYMBOLS if s["name"] == name)
                win_amount = bet * symbol["value"] // 5
                win_type = f"3x {name}"
                break
    
    # Wild bonus
    wild_count = symbol_counts.get("Wild", 0)
    if wild_count >= 2:
        win_amount += bet * 10 * wild_count
        win_type = f"{win_type or ''} + {wild_count}x Wild Bonus"
    
    # Scatter bonus
    scatter_count = symbol_counts.get("Scatter", 0)
    if scatter_count >= 3:
        win_amount += bet * 5 * scatter_count
        win_type = f"{win_type or ''} + {scatter_count}x Scatter Bonus"
    
    return {
        "amount": win_amount,
        "type": win_type or "No Win",
        "symbols": [{"name": s["name"], "emoji": s["emoji"]} for s in symbols]
    }


# Pydantic Models
class SpinRequest(BaseModel):
    bet: int = 10
    client_seed: Optional[str] = None


class SpinResponse(BaseModel):
    spin_id: str
    timestamp: str
    reel_stops: list[int]
    symbols: list[dict]
    bet: int
    win_amount: int
    win_type: str
    commitment_hash: str
    server_seed_hash: str
    client_seed: str
    nonce: int
    combined_seed_hex: str
    three_body_state: dict
    theta_values: list[float]


class VerificationBundle(BaseModel):
    spin_id: str
    timestamp: str
    server_seed: str
    client_seed: str
    nonce: int
    commitment_hash: str
    combined_seed_hex: str
    reel_stops: list[int]
    symbols: list[str]
    win_amount: int
    three_body_initial_conditions: dict
    three_body_final_state: dict
    theta_values: list[float]


class SimulationState(BaseModel):
    time: float
    bodies: list[dict]
    history: list[dict]
    theta_values: list[float]


@app.get("/healthz")
async def healthz():
    return {"status": "ok"}


@app.get("/api/symbols")
async def get_symbols():
    """Get all available slot symbols"""
    return {"symbols": SYMBOLS}


@app.post("/api/spin", response_model=SpinResponse)
async def spin(request: SpinRequest):
    """Execute a slot spin using three-body entropy"""
    # Generate server seed
    server_seed = secrets.token_hex(32)
    server_seed_hash = hashlib.sha256(server_seed.encode()).hexdigest()
    
    # Use client seed or generate one
    client_seed = request.client_seed or secrets.token_hex(16)
    
    # Generate nonce (could be session-based, using random for demo)
    nonce = secrets.randbelow(1000000)
    
    # Create commitment hash (server commits before knowing client seed)
    commitment_hash = hashlib.sha256(server_seed.encode()).hexdigest()
    
    # Initialize three-body simulation with chaotic conditions
    sim = ThreeBodySimulation()
    sim.initialize_chaotic(server_seed)
    
    # Store initial conditions
    initial_conditions = {
        "bodies": [b.to_dict() for b in sim.bodies],
        "gravitational_constant": sim.G,
        "softening": sim.softening
    }
    
    # Run simulation
    sim.simulate(duration=2.0, dt=0.001, record_interval=50)
    
    # Get entropy from simulation
    entropy = sim.get_entropy_value()
    theta_values = sim.get_theta_values()
    
    # Derive combined seed using HKDF
    combined_seed_hex = derive_combined_seed(server_seed, client_seed, nonce)
    
    # Derive reel stops
    reel_stops = derive_reel_stops(combined_seed_hex)
    
    # Calculate win
    win_result = calculate_win(reel_stops, request.bet)
    
    # Generate spin ID
    spin_id = f"spin_{uuid.uuid4().hex[:12]}"
    timestamp = datetime.utcnow().isoformat() + "Z"
    
    # Store spin data for verification
    spin_data = {
        "spin_id": spin_id,
        "timestamp": timestamp,
        "server_seed": server_seed,
        "client_seed": client_seed,
        "nonce": nonce,
        "commitment_hash": commitment_hash,
        "combined_seed_hex": combined_seed_hex,
        "reel_stops": reel_stops,
        "symbols": [SYMBOLS[stop]["name"] for stop in reel_stops],
        "win_amount": win_result["amount"],
        "three_body_initial_conditions": initial_conditions,
        "three_body_final_state": {
            "bodies": [b.to_dict() for b in sim.bodies],
            "entropy": entropy
        },
        "theta_values": theta_values,
        "simulation_history": sim.history
    }
    spin_storage[spin_id] = spin_data
    
    return SpinResponse(
        spin_id=spin_id,
        timestamp=timestamp,
        reel_stops=reel_stops,
        symbols=win_result["symbols"],
        bet=request.bet,
        win_amount=win_result["amount"],
        win_type=win_result["type"],
        commitment_hash=commitment_hash,
        server_seed_hash=server_seed_hash,
        client_seed=client_seed,
        nonce=nonce,
        combined_seed_hex=combined_seed_hex,
        three_body_state={
            "initial": initial_conditions,
            "final": {
                "bodies": [b.to_dict() for b in sim.bodies],
                "entropy": entropy
            }
        },
        theta_values=theta_values
    )


@app.get("/api/verify/{spin_id}")
async def verify_spin(spin_id: str):
    """Get verification bundle for a spin"""
    if spin_id not in spin_storage:
        raise HTTPException(status_code=404, detail="Spin not found")
    
    spin_data = spin_storage[spin_id]
    
    return VerificationBundle(
        spin_id=spin_data["spin_id"],
        timestamp=spin_data["timestamp"],
        server_seed=spin_data["server_seed"],
        client_seed=spin_data["client_seed"],
        nonce=spin_data["nonce"],
        commitment_hash=spin_data["commitment_hash"],
        combined_seed_hex=spin_data["combined_seed_hex"],
        reel_stops=spin_data["reel_stops"],
        symbols=spin_data["symbols"],
        win_amount=spin_data["win_amount"],
        three_body_initial_conditions=spin_data["three_body_initial_conditions"],
        three_body_final_state=spin_data["three_body_final_state"],
        theta_values=spin_data["theta_values"]
    )


@app.get("/api/simulation/{spin_id}")
async def get_simulation(spin_id: str):
    """Get three-body simulation data for a spin"""
    if spin_id not in spin_storage:
        raise HTTPException(status_code=404, detail="Spin not found")
    
    spin_data = spin_storage[spin_id]
    
    return {
        "spin_id": spin_id,
        "initial_conditions": spin_data["three_body_initial_conditions"],
        "final_state": spin_data["three_body_final_state"],
        "history": spin_data["simulation_history"],
        "theta_values": spin_data["theta_values"]
    }


@app.get("/api/simulation")
async def get_live_simulation():
    """Run a live three-body simulation for visualization"""
    sim = ThreeBodySimulation()
    sim.initialize_figure_eight()
    sim.simulate(duration=5.0, dt=0.001, record_interval=20)
    
    return SimulationState(
        time=sim.time,
        bodies=[b.to_dict() for b in sim.bodies],
        history=sim.history,
        theta_values=sim.get_theta_values()
    )

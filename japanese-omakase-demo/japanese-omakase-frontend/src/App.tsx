import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import './App.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

interface Symbol {
  name: string;
  emoji: string;
}

interface SpinResult {
  spin_id: string;
  timestamp: string;
  reel_stops: number[];
  symbols: Symbol[];
  bet: number;
  win_amount: number;
  win_type: string;
  commitment_hash: string;
  server_seed_hash: string;
  client_seed: string;
  nonce: number;
  combined_seed_hex: string;
  three_body_state: {
    initial: {
      bodies: Array<{
        mass: number;
        position: { x: number; y: number; z: number };
        velocity: { x: number; y: number; z: number };
      }>;
    };
    final: {
      bodies: Array<{
        mass: number;
        position: { x: number; y: number; z: number };
        velocity: { x: number; y: number; z: number };
      }>;
      entropy: {
        hex: string;
        value: number;
      };
    };
  };
  theta_values: number[];
}

interface VerificationBundle {
  spin_id: string;
  timestamp: string;
  server_seed: string;
  client_seed: string;
  nonce: number;
  commitment_hash: string;
  combined_seed_hex: string;
  reel_stops: number[];
  symbols: string[];
  win_amount: number;
  three_body_initial_conditions: object;
  three_body_final_state: object;
  theta_values: number[];
}

function ThreeBodyVisualization({ 
  bodies, 
  isAnimating 
}: { 
  bodies: Array<{ position: { x: number; y: number; z: number } }>;
  isAnimating: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const [animatedBodies, setAnimatedBodies] = useState(bodies);

  useEffect(() => {
    if (bodies.length > 0) {
      setAnimatedBodies(bodies);
    }
  }, [bodies]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = () => {
      const width = canvas.width;
      const height = canvas.height;
      const centerX = width / 2;
      const centerY = height / 2;
      const scale = 60;

      ctx.fillStyle = '#0a0a0a';
      ctx.fillRect(0, 0, width, height);

      ctx.strokeStyle = '#1a1a2e';
      ctx.lineWidth = 1;
      for (let i = -5; i <= 5; i++) {
        ctx.beginPath();
        ctx.moveTo(centerX + i * scale, 0);
        ctx.lineTo(centerX + i * scale, height);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, centerY + i * scale);
        ctx.lineTo(width, centerY + i * scale);
        ctx.stroke();
      }

      const colors = ['#ff6b6b', '#4ecdc4', '#ffe66d'];
      const glowColors = ['rgba(255, 107, 107, 0.3)', 'rgba(78, 205, 196, 0.3)', 'rgba(255, 230, 109, 0.3)'];

      animatedBodies.forEach((body, index) => {
        const x = centerX + body.position.x * scale;
        const y = centerY - body.position.y * scale;

        const gradient = ctx.createRadialGradient(x, y, 0, x, y, 20);
        gradient.addColorStop(0, glowColors[index]);
        gradient.addColorStop(1, 'transparent');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, 20, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = colors[index];
        ctx.beginPath();
        ctx.arc(x, y, 8, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.font = '10px monospace';
        ctx.fillText(`Body ${index + 1}`, x + 12, y - 12);
      });

      ctx.fillStyle = '#666';
      ctx.font = '10px monospace';
      ctx.fillText('Three-Body Gravitational System', 10, 20);
    };

    draw();

    if (isAnimating) {
      let frame = 0;
      const animate = () => {
        frame++;
        const t = frame * 0.02;
        
        setAnimatedBodies(prev => prev.map((body, i) => ({
          position: {
            x: body.position.x + Math.sin(t + i * 2) * 0.02,
            y: body.position.y + Math.cos(t + i * 2) * 0.02,
            z: body.position.z
          }
        })));
        
        animationRef.current = requestAnimationFrame(animate);
      };
      animate();
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [animatedBodies, isAnimating]);

  return (
    <canvas 
      ref={canvasRef} 
      width={400} 
      height={300} 
      className="rounded-lg border border-gray-700"
    />
  );
}

function SlotReel({ symbol, isSpinning }: { symbol: Symbol | null; isSpinning: boolean }) {
  const [displaySymbol, setDisplaySymbol] = useState<Symbol | null>(symbol);
  const [spinningSymbols] = useState([
    { name: 'Sushi', emoji: '🍣' },
    { name: 'Sashimi', emoji: '🍱' },
    { name: 'Tempura', emoji: '🍤' },
    { name: 'Ramen', emoji: '🍜' },
    { name: 'Sake', emoji: '🍶' },
    { name: 'Chopsticks', emoji: '🥢' },
    { name: 'Tea', emoji: '🍵' },
    { name: 'Wild', emoji: '👨‍🍳' },
    { name: 'Scatter', emoji: '🏮' },
  ]);

  useEffect(() => {
    if (isSpinning) {
      let frame = 0;
      const interval = setInterval(() => {
        setDisplaySymbol(spinningSymbols[frame % spinningSymbols.length]);
        frame++;
      }, 80);
      return () => clearInterval(interval);
    } else if (symbol) {
      setDisplaySymbol(symbol);
    }
  }, [isSpinning, symbol, spinningSymbols]);

  return (
    <div className={`
      w-20 h-24 bg-gradient-to-b from-amber-900 to-amber-950 
      rounded-lg border-2 border-amber-600 
      flex items-center justify-center
      shadow-lg shadow-amber-900/50
      ${isSpinning ? 'animate-pulse' : ''}
    `}>
      <span className="text-4xl">
        {displaySymbol?.emoji || '?'}
      </span>
    </div>
  );
}

function App() {
  const [balance, setBalance] = useState(1000);
  const [bet, setBet] = useState(10);
  const [isSpinning, setIsSpinning] = useState(false);
  const [lastSpin, setLastSpin] = useState<SpinResult | null>(null);
  const [verificationBundle, setVerificationBundle] = useState<VerificationBundle | null>(null);
  const [showVerification, setShowVerification] = useState(false);
  const [spinHistory, setSpinHistory] = useState<SpinResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  const defaultBodies = [
    { position: { x: -1, y: 0.5, z: 0 } },
    { position: { x: 1, y: -0.5, z: 0 } },
    { position: { x: 0, y: 0, z: 0 } },
  ];

  const spin = useCallback(async () => {
    if (balance < bet) {
      setError('Insufficient balance!');
      return;
    }

    setIsSpinning(true);
    setError(null);
    setBalance(prev => prev - bet);

    try {
      const response = await fetch(`${API_URL}/api/spin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bet }),
      });

      if (!response.ok) {
        throw new Error('Spin failed');
      }

      const result: SpinResult = await response.json();
      
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setLastSpin(result);
      setBalance(prev => prev + result.win_amount);
      setSpinHistory(prev => [result, ...prev.slice(0, 9)]);
    } catch {
      setError('Failed to spin. Please try again.');
      setBalance(prev => prev + bet);
    }finally {
      setIsSpinning(false);
    }
  }, [balance, bet]);

  const verifyLastSpin = useCallback(async () => {
    if (!lastSpin) return;

    try {
      const response = await fetch(`${API_URL}/api/verify/${lastSpin.spin_id}`);
      if (!response.ok) {
        throw new Error('Verification failed');
      }
      const bundle: VerificationBundle = await response.json();
      setVerificationBundle(bundle);
      setShowVerification(true);
    } catch {
      setError('Failed to verify spin.');
    }
  }, [lastSpin]);

  const downloadVerificationBundle = useCallback(() => {
    if (!verificationBundle) return;
    
    const blob = new Blob([JSON.stringify(verificationBundle, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `verification-${verificationBundle.spin_id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [verificationBundle]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-red-950 to-gray-900">
      <header className="bg-black/50 border-b border-amber-600/30 p-4">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🍣</span>
            <div>
              <h1 className="text-2xl font-bold text-amber-400">Japanese Omakase</h1>
              <p className="text-xs text-amber-200/60">Three-Body Entropy Slot Machine</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Badge variant="outline" className="text-amber-400 border-amber-600 px-4 py-2">
              Balance: ${balance.toLocaleString()}
            </Badge>
          </div>
        </div>
      </header>

      <main className="container mx-auto p-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card className="bg-gradient-to-b from-red-950 to-gray-900 border-amber-600/50">
              <CardContent className="p-6">
                <div className="flex flex-col items-center">
                  <div className="bg-black/50 rounded-xl p-6 border border-amber-600/30 mb-6">
                    <div className="flex gap-2 justify-center">
                      {[0, 1, 2, 3, 4].map((index) => (
                        <SlotReel
                          key={index}
                          symbol={lastSpin?.symbols[index] || null}
                          isSpinning={isSpinning}
                        />
                      ))}
                    </div>
                  </div>

                  {lastSpin && !isSpinning && (
                    <div className="text-center mb-4">
                      {lastSpin.win_amount > 0 ? (
                        <div className="animate-bounce">
                          <p className="text-3xl font-bold text-amber-400">
                            WIN: ${lastSpin.win_amount}
                          </p>
                          <p className="text-amber-200/80">{lastSpin.win_type}</p>
                        </div>
                      ) : (
                        <p className="text-gray-400">No win this time</p>
                      )}
                    </div>
                  )}

                  {error && (
                    <p className="text-red-400 mb-4">{error}</p>
                  )}

                  <div className="flex items-center gap-4 mb-4">
                    <label className="text-amber-200">Bet:</label>
                    <div className="flex gap-2">
                      {[10, 25, 50, 100].map((amount) => (
                        <Button
                          key={amount}
                          variant={bet === amount ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setBet(amount)}
                          disabled={isSpinning}
                          className={bet === amount 
                            ? 'bg-amber-600 hover:bg-amber-700' 
                            : 'border-amber-600 text-amber-400 hover:bg-amber-600/20'}
                        >
                          ${amount}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <Button
                    size="lg"
                    onClick={spin}
                    disabled={isSpinning || balance < bet}
                    className="bg-gradient-to-r from-amber-600 to-red-600 hover:from-amber-700 hover:to-red-700 text-white font-bold px-12 py-6 text-xl"
                  >
                    {isSpinning ? 'SPINNING...' : 'SPIN'}
                  </Button>

                  {lastSpin && !isSpinning && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={verifyLastSpin}
                      className="mt-4 border-amber-600 text-amber-400 hover:bg-amber-600/20"
                    >
                      Verify Fairness
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {showVerification && verificationBundle && (
              <Card className="mt-4 bg-gray-900/90 border-green-600/50">
                <CardHeader>
                  <CardTitle className="text-green-400 flex items-center gap-2">
                    <span>Verification Bundle</span>
                    <Badge variant="outline" className="text-green-400 border-green-600">
                      Provably Fair
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-400">Spin ID</p>
                      <p className="font-mono text-green-300 break-all">{verificationBundle.spin_id}</p>
                    </div>
                    <div>
                      <p className="text-gray-400">Timestamp</p>
                      <p className="font-mono text-green-300">{verificationBundle.timestamp}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-gray-400">Server Seed</p>
                      <p className="font-mono text-green-300 break-all text-xs">{verificationBundle.server_seed}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-gray-400">Client Seed</p>
                      <p className="font-mono text-green-300 break-all text-xs">{verificationBundle.client_seed}</p>
                    </div>
                    <div>
                      <p className="text-gray-400">Nonce</p>
                      <p className="font-mono text-green-300">{verificationBundle.nonce}</p>
                    </div>
                    <div>
                      <p className="text-gray-400">Reel Stops</p>
                      <p className="font-mono text-green-300">[{verificationBundle.reel_stops.join(', ')}]</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-gray-400">Commitment Hash (SHA-256)</p>
                      <p className="font-mono text-green-300 break-all text-xs">{verificationBundle.commitment_hash}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-gray-400">Combined Seed (HKDF)</p>
                      <p className="font-mono text-green-300 break-all text-xs">{verificationBundle.combined_seed_hex}</p>
                    </div>
                  </div>
                  <Separator className="bg-green-600/30" />
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={downloadVerificationBundle}
                      className="border-green-600 text-green-400 hover:bg-green-600/20"
                    >
                      Download Bundle
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowVerification(false)}
                      className="border-gray-600 text-gray-400 hover:bg-gray-600/20"
                    >
                      Close
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="space-y-4">
            <Card className="bg-gray-900/90 border-cyan-600/50">
              <CardHeader>
                <CardTitle className="text-cyan-400 text-lg">Three-Body Physics</CardTitle>
              </CardHeader>
              <CardContent>
                <ThreeBodyVisualization
                  bodies={lastSpin?.three_body_state.final.bodies || defaultBodies}
                  isAnimating={isSpinning}
                />
                <div className="mt-4 space-y-2 text-sm">
                  <p className="text-gray-400">
                    Entropy is generated from chaotic three-body gravitational dynamics.
                  </p>
                  {lastSpin && (
                    <div className="bg-black/30 rounded p-2">
                      <p className="text-cyan-300 text-xs font-mono">
                        Entropy: {lastSpin.three_body_state.final.entropy?.value.toFixed(8)}
                      </p>
                      <p className="text-cyan-300/60 text-xs font-mono break-all">
                        Hash: {lastSpin.three_body_state.final.entropy?.hex.slice(0, 32)}...
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Tabs defaultValue="paytable" className="w-full">
              <TabsList className="w-full bg-gray-800">
                <TabsTrigger value="paytable" className="flex-1">Paytable</TabsTrigger>
                <TabsTrigger value="history" className="flex-1">History</TabsTrigger>
                <TabsTrigger value="info" className="flex-1">Info</TabsTrigger>
              </TabsList>
              
              <TabsContent value="paytable">
                <Card className="bg-gray-900/90 border-amber-600/30">
                  <CardContent className="p-4">
                    <div className="space-y-2 text-sm">
                      {[
                        { emoji: '🍣', name: 'Sushi', mult: '100x' },
                        { emoji: '🍱', name: 'Sashimi', mult: '80x' },
                        { emoji: '🍤', name: 'Tempura', mult: '60x' },
                        { emoji: '🍜', name: 'Ramen', mult: '40x' },
                        { emoji: '🍶', name: 'Sake', mult: '30x' },
                        { emoji: '🥢', name: 'Chopsticks', mult: '20x' },
                        { emoji: '🍵', name: 'Tea', mult: '15x' },
                        { emoji: '👨‍🍳', name: 'Wild (Chef)', mult: 'Bonus' },
                        { emoji: '🏮', name: 'Scatter', mult: 'Bonus' },
                      ].map((item) => (
                        <div key={item.name} className="flex items-center justify-between">
                          <span className="flex items-center gap-2">
                            <span className="text-xl">{item.emoji}</span>
                            <span className="text-amber-200">{item.name}</span>
                          </span>
                          <span className="text-amber-400">{item.mult}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="history">
                <Card className="bg-gray-900/90 border-amber-600/30">
                  <CardContent className="p-4">
                    {spinHistory.length === 0 ? (
                      <p className="text-gray-400 text-center">No spins yet</p>
                    ) : (
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {spinHistory.map((spin) => (
                          <div 
                            key={spin.spin_id} 
                            className="flex items-center justify-between p-2 bg-black/30 rounded"
                          >
                            <div className="flex gap-1">
                              {spin.symbols.map((s, i) => (
                                <span key={i} className="text-lg">{s.emoji}</span>
                              ))}
                            </div>
                            <span className={spin.win_amount > 0 ? 'text-green-400' : 'text-gray-400'}>
                              {spin.win_amount > 0 ? `+$${spin.win_amount}` : '-$' + spin.bet}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="info">
                <Card className="bg-gray-900/90 border-amber-600/30">
                  <CardContent className="p-4 text-sm text-gray-300 space-y-3">
                    <p>
                      <strong className="text-amber-400">Provably Fair:</strong> Every spin uses 
                      three-body gravitational physics to generate cryptographically secure randomness.
                    </p>
                    <p>
                      <strong className="text-amber-400">How it works:</strong> The chaotic nature 
                      of the three-body problem ensures unpredictable outcomes that can be 
                      independently verified.
                    </p>
                    <p>
                      <strong className="text-amber-400">Verification:</strong> Click "Verify Fairness" 
                      after any spin to download the cryptographic proof bundle.
                    </p>
                    <Separator className="bg-amber-600/30" />
                    <p className="text-xs text-gray-500">
                      Built with Three-Body Entropy RNG
                    </p>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </main>

      <footer className="bg-black/50 border-t border-amber-600/30 p-4 mt-8">
        <div className="container mx-auto text-center text-amber-200/60 text-sm">
          <p>Japanese Omakase Three-Body Entropy Slot Machine Demo</p>
          <p className="text-xs mt-1">Powered by Three-Body Gravitational Dynamics RNG</p>
        </div>
      </footer>
    </div>
  );
}

export default App

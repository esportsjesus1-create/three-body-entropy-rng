'use client';

import { useState, useEffect, useCallback } from 'react';
import ThreeBodyVisualization from './ThreeBodyVisualization';
import ProvablyFairPanel from './ProvablyFairPanel';

interface SlotMachineProps {
  gameId: string;
  gameName: string;
  initialBalance?: number;
}

interface SpinData {
  spinId: string;
  serverSeed: string;
  clientSeed: string;
  nonce: number;
  commitmentHash: string;
  combinedSeedHex: string;
  entropyHex: string;
  reelStops: number[];
  symbols: string[];
  physicsState: {
    finalBodies: Array<{
      mass: number;
      position: { x: string; y: string; z: string };
      velocity: { x: string; y: string; z: string };
    }>;
    totalEnergy: number;
    angularMomentum: { x: number; y: number; z: number };
    iterations: number;
    dt: number;
  };
  bet: number;
  winAmount: number;
  multiplier: number;
  isWin: boolean;
}

const SYMBOL_EMOJIS: Record<string, string> = {
  fire: '🔥',
  water: '💧',
  earth: '🌍',
  air: '💨',
  lightning: '⚡',
  ice: '❄️',
  nature: '🌿',
  dark: '🌑',
  light: '☀️',
  dragon: '🐉',
  tiger: '🐅',
  crane: '🦢',
  snake: '🐍',
  monkey: '🐵',
  master: '👨‍🦳',
  scroll: '📜',
  temple: '🏯',
  sword: '⚔️',
  ruby: '🔴',
  emerald: '🟢',
  sapphire: '🔵',
  diamond: '💎',
  amethyst: '🟣',
  topaz: '🟡',
  jade: '🟩',
  pearl: '⚪',
  gold: '🥇',
  cherry: '🍒',
  lemon: '🍋',
  orange: '🍊',
  plum: '🍇',
  bell: '🔔',
  bar: '📊',
  seven: '7️⃣',
  star: '⭐',
  wild: '🃏',
};

const BET_OPTIONS = [1, 5, 10, 25, 50, 100];

function generateRandomClientSeed(): string {
  const array = new Uint8Array(16);
  if (typeof window !== 'undefined' && window.crypto) {
    window.crypto.getRandomValues(array);
  } else {
    // Server-side rendering fallback - use timestamp-based seed
    // This is only used for initial render, client will regenerate with crypto
    const timestamp = Date.now();
    for (let i = 0; i < 16; i++) {
      array[i] = (timestamp >> (i % 8)) & 0xff;
    }
  }
  return Array.from(array, (b) => b.toString(16).padStart(2, '0')).join('');
}

export default function SlotMachine({
  gameId,
  gameName,
  initialBalance = 1000,
}: SlotMachineProps) {
  const [balance, setBalance] = useState(initialBalance);
  const [bet, setBet] = useState(10);
  const [isSpinning, setIsSpinning] = useState(false);
  const [reels, setReels] = useState<string[]>(['?', '?', '?', '?', '?']);
  const [spinningReels, setSpinningReels] = useState<boolean[]>([false, false, false, false, false]);
  const [spinData, setSpinData] = useState<SpinData | null>(null);
  const [commitmentHash, setCommitmentHash] = useState<string | null>(null);
  const [spinId, setSpinId] = useState<string | null>(null);
  const [clientSeed, setClientSeed] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [messageType, setMessageType] = useState<'win' | 'lose' | 'info'>('info');
  const [isInitializing, setIsInitializing] = useState(false);

  const initializeCommitment = useCallback(async () => {
    setIsInitializing(true);
    try {
      const response = await fetch('/api/slots/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId }),
      });

      const result = await response.json();
      if (result.success) {
        setCommitmentHash(result.data.commitmentHash);
        setSpinId(result.data.spinId);
        setSpinData(null);
      }
    } catch (error) {
      console.error('Failed to initialize commitment:', error);
      setMessage('Failed to connect to server. Please try again.');
      setMessageType('info');
    } finally {
      setIsInitializing(false);
    }
  }, [gameId]);

  useEffect(() => {
    initializeCommitment();
    setClientSeed(generateRandomClientSeed());
  }, [initializeCommitment]);

  const spin = useCallback(async () => {
    if (isSpinning || balance < bet || !spinId || !clientSeed) return;

    setIsSpinning(true);
    setMessage('');
    setSpinningReels([true, true, true, true, true]);

    try {
      const response = await fetch('/api/slots/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          spinId,
          clientSeed,
          bet,
          gameId,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Spin failed');
      }

      const data = result.data as SpinData;

      const stopDelays = [800, 1000, 1200, 1400, 1600];
      for (let i = 0; i < 5; i++) {
        await new Promise((resolve) => setTimeout(resolve, stopDelays[i] - (i > 0 ? stopDelays[i - 1] : 0)));
        setSpinningReels((prev) => {
          const next = [...prev];
          next[i] = false;
          return next;
        });
        setReels((prev) => {
          const next = [...prev];
          next[i] = data.symbols[i];
          return next;
        });
      }

      setSpinData(data);

      if (data.isWin) {
        setBalance((prev) => prev - bet + data.winAmount);
        setMessage(`WIN! ${data.multiplier}x - +${data.winAmount} credits!`);
        setMessageType('win');
      } else {
        setBalance((prev) => prev - bet);
        setMessage('No win this time. Try again!');
        setMessageType('lose');
      }
    } catch (error) {
      console.error('Spin error:', error);
      setMessage('Error during spin. Please try again.');
      setMessageType('info');
      setSpinningReels([false, false, false, false, false]);
    } finally {
      setIsSpinning(false);
    }
  }, [isSpinning, balance, bet, spinId, clientSeed, gameId]);

  const handleNewSpin = useCallback(async () => {
    setReels(['?', '?', '?', '?', '?']);
    setSpinData(null);
    setMessage('');
    setClientSeed(generateRandomClientSeed());
    await initializeCommitment();
  }, [initializeCommitment]);

  const getSymbolDisplay = (symbol: string) => {
    return SYMBOL_EMOJIS[symbol] || symbol;
  };

  const resetGame = () => {
    setBalance(initialBalance);
    setReels(['?', '?', '?', '?', '?']);
    setSpinData(null);
    setCommitmentHash(null);
    setSpinId(null);
    setMessage('');
    setClientSeed(generateRandomClientSeed());
    initializeCommitment();
  };

  const canSpin = !isSpinning && !isInitializing && balance >= bet && !!commitmentHash && !!clientSeed && !spinData;

  return (
    <div className="max-w-6xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="bg-secondary-bg rounded-2xl p-6 md:p-8 border border-primary/20">
            <div className="text-center mb-6">
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">{gameName}</h2>
              <p className="text-gray-400 text-sm">Demo Mode - Provably Fair</p>
            </div>

            <div className="flex flex-col lg:flex-row gap-6 items-center justify-center mb-6">
              <div className="flex-shrink-0">
                <ThreeBodyVisualization isAnimating={isSpinning} size={180} />
              </div>

              <div className="flex-1 w-full">
                <div className="bg-primary-bg rounded-xl p-4 md:p-6 border border-primary/30">
                  <div className="flex justify-center gap-2 md:gap-3 mb-4">
                    {reels.map((symbol, index) => (
                      <div
                        key={index}
                        className={`
                          w-14 h-20 md:w-20 md:h-28 
                          bg-gradient-to-b from-secondary-bg to-primary-bg 
                          rounded-lg border-2 border-primary/40
                          flex items-center justify-center
                          text-3xl md:text-5xl
                          transition-all duration-200
                          ${spinningReels[index] ? 'animate-pulse border-secondary' : ''}
                          ${spinData?.isWin && !isSpinning ? 'border-green-500 shadow-lg' : ''}
                        `}
                      >
                        <span className={spinningReels[index] ? 'animate-bounce' : ''}>
                          {spinningReels[index] ? <SpinningReel /> : getSymbolDisplay(symbol)}
                        </span>
                      </div>
                    ))}
                  </div>

                  {message && (
                    <div
                      className={`
                        text-center py-3 px-4 rounded-lg mb-4 font-bold text-lg
                        ${messageType === 'win' ? 'bg-green-900/50 text-green-400 animate-pulse' : ''}
                        ${messageType === 'lose' ? 'bg-red-900/30 text-red-400' : ''}
                        ${messageType === 'info' ? 'bg-blue-900/30 text-blue-400' : ''}
                      `}
                    >
                      {message}
                    </div>
                  )}

                  <div className="flex flex-wrap justify-center gap-4 items-center">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400 text-sm">Balance:</span>
                      <span className="text-xl font-bold text-secondary">{balance}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-gray-400 text-sm">Bet:</span>
                      <select
                        value={bet}
                        onChange={(e) => setBet(Number(e.target.value))}
                        disabled={isSpinning}
                        className="bg-primary-bg border border-primary/40 rounded px-3 py-1 text-white"
                      >
                        {BET_OPTIONS.map((option) => (
                          <option key={option} value={option} disabled={option > balance}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap justify-center gap-4 mb-6">
              {spinData ? (
                <button
                  onClick={handleNewSpin}
                  disabled={isInitializing}
                  className="bg-primary hover:bg-primary/80 text-white text-xl px-12 py-4 rounded-lg font-bold disabled:opacity-50"
                >
                  {isInitializing ? 'LOADING...' : 'NEW SPIN'}
                </button>
              ) : (
                <button
                  onClick={spin}
                  disabled={!canSpin}
                  className={`
                    bg-primary hover:bg-primary/80 text-white text-xl px-12 py-4 rounded-lg font-bold
                    ${!canSpin ? 'opacity-50 cursor-not-allowed' : ''}
                  `}
                >
                  {isSpinning ? 'SPINNING...' : isInitializing ? 'LOADING...' : 'SPIN'}
                </button>
              )}

              <button
                onClick={resetGame}
                disabled={isSpinning}
                className="bg-secondary hover:bg-secondary/80 text-white px-6 py-4 rounded-lg font-semibold"
              >
                Reset Demo
              </button>
            </div>

            <div className="text-center text-xs text-gray-500">
              <p>This is a demo game. No real money is involved.</p>
              <p className="mt-1">
                Every spin is cryptographically verified using the Three-Body Entropy RNG system.
              </p>
            </div>
          </div>
        </div>

        <div className="lg:col-span-1">
          <ProvablyFairPanel
            commitmentHash={commitmentHash}
            spinId={spinId}
            clientSeed={clientSeed}
            onClientSeedChange={setClientSeed}
            spinData={spinData}
            isSpinning={isSpinning}
            onGenerateClientSeed={() => setClientSeed(generateRandomClientSeed())}
          />
        </div>
      </div>
    </div>
  );
}

function SpinningReel() {
  const [symbol, setSymbol] = useState('🎰');

  useEffect(() => {
    const symbols = Object.values(SYMBOL_EMOJIS);
    let counter = 0;
    const interval = setInterval(() => {
      // Use deterministic cycling through symbols instead of Math.random()
      setSymbol(symbols[counter % symbols.length]);
      counter++;
    }, 80);

    return () => clearInterval(interval);
  }, []);

  return <span>{symbol}</span>;
}

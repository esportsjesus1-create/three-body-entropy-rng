"use client";

import { useState, useCallback } from "react";
import ThreeBodySimulation from "./ThreeBodySimulation";

interface ReelState {
  phase: "idle" | "committing" | "committed" | "revealing" | "revealed";
  sessionId?: string;
  commitment?: string;
  houseSeed?: string;
  clientSeed?: string;
  entropyHex?: string;
  position?: number;
  symbol?: string;
}

const SYMBOLS = ["7", "BAR", "Cherry", "Bell", "Lemon", "Orange", "Plum", "Grape", "Melon", "Star"];
const SYMBOL_EMOJIS: Record<string, string> = {
  "7": "7️",
  "BAR": "📊",
  "Cherry": "🍒",
  "Bell": "🔔",
  "Lemon": "🍋",
  "Orange": "🍊",
  "Plum": "🍑",
  "Grape": "🍇",
  "Melon": "🍈",
  "Star": "⭐",
};

async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

function generateClientSeed(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => b.toString(16).padStart(2, "0")).join("");
}

function entropyToPosition(entropyHex: string, numSymbols: number): number {
  const truncated = entropyHex.substring(0, 12);
  const value = parseInt(truncated, 16);
  return value % numSymbols;
}

export default function FiveReelDemo() {
  const [reels, setReels] = useState<ReelState[]>(
    Array(5).fill(null).map(() => ({ phase: "idle" }))
  );
  const [isSpinning, setIsSpinning] = useState(false);
  const [showSimulations, setShowSimulations] = useState(true);

  const simulateCommit = useCallback(async (reelIndex: number) => {
    await new Promise((resolve) => setTimeout(resolve, 200 + Math.random() * 300));
    const sessionId = `reel${reelIndex}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const houseSeed = Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    const commitment = await sha256(houseSeed);
    return { sessionId, commitment, houseSeed };
  }, []);

  const simulateReveal = useCallback(
    async (houseSeed: string, clientSeed: string) => {
      await new Promise((resolve) => setTimeout(resolve, 200 + Math.random() * 300));
      const combined = houseSeed + clientSeed;
      const entropyHex = await sha256(combined);
      return entropyHex;
    },
    []
  );

  const handleSpin = async () => {
    setIsSpinning(true);

    setReels(Array(5).fill(null).map(() => ({ phase: "committing" })));

    const commitPromises = Array(5).fill(null).map((_, i) => simulateCommit(i));
    const commits = await Promise.all(commitPromises);

    setReels(
      commits.map((commit) => ({
        phase: "committed" as const,
        sessionId: commit.sessionId,
        commitment: commit.commitment,
        houseSeed: commit.houseSeed,
      }))
    );

    await new Promise((resolve) => setTimeout(resolve, 500));

    const clientSeed = generateClientSeed();

    setReels((prev) =>
      prev.map((reel) => ({
        ...reel,
        phase: "revealing" as const,
        clientSeed,
      }))
    );

    const revealPromises = commits.map((commit) =>
      simulateReveal(commit.houseSeed, clientSeed)
    );
    const entropies = await Promise.all(revealPromises);

    setReels((prev) =>
      prev.map((reel, i) => {
        const entropyHex = entropies[i];
        const position = entropyToPosition(entropyHex, SYMBOLS.length);
        return {
          ...reel,
          phase: "revealed" as const,
          entropyHex,
          position,
          symbol: SYMBOLS[position],
        };
      })
    );

    setIsSpinning(false);
  };

  const handleReset = () => {
    setReels(Array(5).fill(null).map(() => ({ phase: "idle" })));
  };

  return (
    <div className="bg-secondary-bg rounded-xl p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-bold text-white">
          5-Reel Independent Entropy Demo
        </h3>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={showSimulations}
            onChange={(e) => setShowSimulations(e.target.checked)}
            className="rounded"
          />
          <span className="text-text-secondary">Show Physics</span>
        </label>
      </div>

      <p className="text-text-secondary mb-6">
        Each reel gets its own independent three-body physics simulation. All 5 commits 
        happen in parallel, then all 5 reveals happen in parallel (2 round trips total).
      </p>

      <div className="grid grid-cols-5 gap-2 md:gap-4 mb-6">
        {reels.map((reel, index) => (
          <div
            key={index}
            className="bg-primary-bg rounded-lg p-2 md:p-3 flex flex-col items-center"
          >
            <div className="text-xs text-text-secondary mb-2">Reel {index + 1}</div>
            
            {showSimulations && (
              <div className="mb-2">
                <ThreeBodySimulation
                  width={80}
                  height={80}
                  showTrails={false}
                  perturbation={index * 0.001}
                />
              </div>
            )}

            <div
              className={`w-full aspect-square rounded-lg flex items-center justify-center text-3xl md:text-4xl transition-all duration-300 ${
                reel.phase === "revealed"
                  ? "bg-gradient-to-b from-purple-900/50 to-pink-900/50 border-2 border-purple-500/50"
                  : reel.phase === "committing" || reel.phase === "revealing"
                  ? "bg-gray-800 animate-pulse"
                  : "bg-gray-800"
              }`}
            >
              {reel.phase === "revealed" && reel.symbol
                ? SYMBOL_EMOJIS[reel.symbol] || reel.symbol
                : reel.phase === "committing"
                ? "..."
                : reel.phase === "revealing"
                ? "..."
                : "?"}
            </div>

            <div className="mt-2 w-full text-center">
              <div
                className={`text-xs px-2 py-1 rounded ${
                  reel.phase === "idle"
                    ? "bg-gray-700 text-gray-400"
                    : reel.phase === "committing"
                    ? "bg-yellow-900/50 text-yellow-400"
                    : reel.phase === "committed"
                    ? "bg-yellow-600/50 text-yellow-300"
                    : reel.phase === "revealing"
                    ? "bg-blue-900/50 text-blue-400"
                    : "bg-green-900/50 text-green-400"
                }`}
              >
                {reel.phase === "idle"
                  ? "Ready"
                  : reel.phase === "committing"
                  ? "Commit..."
                  : reel.phase === "committed"
                  ? "Committed"
                  : reel.phase === "revealing"
                  ? "Reveal..."
                  : "Done"}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-4 justify-center mb-6">
        <button
          onClick={handleSpin}
          disabled={isSpinning}
          className="btn-primary px-8"
        >
          {isSpinning ? "Spinning..." : "Spin All 5 Reels"}
        </button>
        <button
          onClick={handleReset}
          disabled={isSpinning}
          className="btn-secondary"
        >
          Reset
        </button>
      </div>

      {reels[0].phase === "revealed" && (
        <div className="bg-primary-bg rounded-lg p-4 overflow-x-auto">
          <h4 className="font-semibold text-white mb-3">Verification Data</h4>
          <div className="space-y-3 text-xs font-mono">
            <div>
              <span className="text-text-secondary">Client Seed (shared): </span>
              <span className="text-blue-400 break-all">{reels[0].clientSeed}</span>
            </div>
            <div className="grid gap-2">
              {reels.map((reel, i) => (
                <div key={i} className="p-2 bg-gray-900 rounded">
                  <div className="text-purple-400 mb-1">Reel {i + 1}:</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-1 text-text-secondary">
                    <div>
                      Commitment: <span className="text-yellow-400">{reel.commitment?.slice(0, 16)}...</span>
                    </div>
                    <div>
                      Entropy: <span className="text-green-400">{reel.entropyHex?.slice(0, 16)}...</span>
                    </div>
                    <div>
                      Position: <span className="text-white">{reel.position}</span>
                    </div>
                    <div>
                      Symbol: <span className="text-white">{reel.symbol}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-4 p-3 bg-purple-900/20 rounded border border-purple-500/20">
            <p className="text-xs text-purple-300">
              <strong>Formula:</strong> position = parseInt(entropy[0:12], 16) % {SYMBOLS.length}
              <br />
              Each reel&apos;s entropy is independently derived from its own three-body simulation.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { SpinResult, getSymbolEmoji } from "@/lib/demoEngine";

interface SlotMachineProps {
  balance: number;
  betAmount: number;
  setBetAmount: (amount: number) => void;
  isSpinning: boolean;
  currentSpin: SpinResult | null;
  onSpin: () => void;
  clientSeed: string;
  onNewClientSeed: () => void;
}

export default function SlotMachine({
  balance,
  betAmount,
  setBetAmount,
  isSpinning,
  currentSpin,
  onSpin,
  clientSeed,
  onNewClientSeed,
}: SlotMachineProps) {
  const reelSymbols = currentSpin?.symbols || ["fa", "zhong", "bai", "wild", "bonus"];

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-gradient-to-b from-gray-800 to-gray-900 rounded-2xl p-6 shadow-2xl border border-purple-500/30">
        <div className="flex justify-between items-center mb-6">
          <div className="text-sm text-gray-400">
            Balance: <span className="text-white font-bold">${balance.toLocaleString()}</span>
          </div>
          {currentSpin && currentSpin.winAmount > 0 && (
            <div className="text-sm text-green-400 font-bold animate-pulse">
              WIN: ${currentSpin.winAmount.toLocaleString()}
            </div>
          )}
        </div>

        <div className="bg-black/50 rounded-xl p-4 mb-6">
          <div className="flex justify-center gap-2">
            {reelSymbols.map((symbol, index) => (
              <div
                key={index}
                className={`w-16 h-20 bg-gradient-to-b from-gray-700 to-gray-800 rounded-lg flex items-center justify-center text-4xl border-2 border-gray-600 ${
                  isSpinning ? "animate-pulse" : ""
                }`}
              >
                {isSpinning ? (
                  <span className="animate-spin">🎰</span>
                ) : (
                  getSymbolEmoji(symbol)
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-400">Bet:</span>
              <button
                onClick={() => setBetAmount(Math.max(1, betAmount - 5))}
                className="w-8 h-8 rounded bg-gray-700 hover:bg-gray-600 text-white font-bold"
                disabled={isSpinning}
              >
                -
              </button>
              <span className="w-16 text-center font-bold text-white">${betAmount}</span>
              <button
                onClick={() => setBetAmount(Math.min(100, betAmount + 5))}
                className="w-8 h-8 rounded bg-gray-700 hover:bg-gray-600 text-white font-bold"
                disabled={isSpinning}
              >
                +
              </button>
            </div>

            <button
              onClick={onSpin}
              disabled={isSpinning || balance < betAmount}
              className={`px-8 py-3 rounded-lg font-bold text-lg transition-all ${
                isSpinning || balance < betAmount
                  ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                  : "bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:scale-105 shadow-lg shadow-purple-500/30"
              }`}
            >
              {isSpinning ? "SPINNING..." : "SPIN"}
            </button>
          </div>

          <div className="bg-gray-800/50 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <span className="text-xs text-gray-500 block">Client Seed</span>
                <span className="text-xs text-gray-400 font-mono truncate block">
                  {clientSeed || "Generating..."}
                </span>
              </div>
              <button
                onClick={onNewClientSeed}
                disabled={isSpinning}
                className="ml-2 px-3 py-1 text-xs bg-gray-700 hover:bg-gray-600 rounded text-gray-300"
              >
                New Seed
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 text-center text-xs text-gray-500">
        Each reel uses independent three-body entropy. Click &quot;RNG Proof&quot; to see verification data.
      </div>
    </div>
  );
}

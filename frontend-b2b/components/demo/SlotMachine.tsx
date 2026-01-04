"use client";

import { useState } from "react";
import { SpinResult, PendingCommitment, getSymbolEmoji } from "@/lib/demoEngine";

interface SlotMachineProps {
  balance: number;
  betAmount: number;
  setBetAmount: (amount: number) => void;
  isSpinning: boolean;
  currentSpin: SpinResult | null;
  onSpin: () => void;
  clientSeed: string;
  onNewClientSeed: () => void;
  pendingCommitment: PendingCommitment | null;
  onViewDetails?: () => void;
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
  pendingCommitment,
  onViewDetails,
}: SlotMachineProps) {
  const [copied, setCopied] = useState(false);
  const reelSymbols = currentSpin?.symbols || ["fa", "zhong", "bai", "wild", "bonus"];
  
  const copyHash = async () => {
    if (pendingCommitment?.gameHash) {
      await navigator.clipboard.writeText(pendingCommitment.gameHash);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };
  
  const isVerified = currentSpin?.verificationStatus?.allCommitmentsValid && 
                     currentSpin?.verificationStatus?.timelineValid;

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

        {pendingCommitment && !isSpinning && !currentSpin && (
          <div className="bg-yellow-900/30 border border-yellow-500/50 rounded-xl p-4 mb-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded-full bg-yellow-500/20 flex items-center justify-center">
                <svg className="w-4 h-4 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <span className="text-yellow-400 font-semibold text-sm">Game Hash (Screenshot This!)</span>
            </div>
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-black/50 rounded px-3 py-2 text-xs font-mono text-yellow-300 break-all">
                {pendingCommitment.gameHash}
              </code>
              <button
                onClick={copyHash}
                className="px-3 py-2 bg-yellow-600/20 hover:bg-yellow-600/30 rounded text-yellow-400 text-xs"
              >
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
            <p className="text-xs text-yellow-400/70 mt-2">
              This hash proves we committed to results BEFORE you spin. Save it to verify fairness.
            </p>
          </div>
        )}

        {currentSpin && !isSpinning && (
          <div className={`rounded-xl p-4 mb-4 ${isVerified ? "bg-green-900/30 border border-green-500/50" : "bg-red-900/30 border border-red-500/50"}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {isVerified ? (
                  <>
                    <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
                      <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div>
                      <span className="text-green-400 font-bold">VERIFIED - Game Was Fair</span>
                      <p className="text-xs text-green-400/70">Hash matched, timeline valid</p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center">
                      <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </div>
                    <div>
                      <span className="text-red-400 font-bold">Verification Issue</span>
                      <p className="text-xs text-red-400/70">Check details for more info</p>
                    </div>
                  </>
                )}
              </div>
              {onViewDetails && (
                <button
                  onClick={onViewDetails}
                  className="text-xs text-gray-400 hover:text-white underline"
                >
                  View Details
                </button>
              )}
            </div>
          </div>
        )}

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

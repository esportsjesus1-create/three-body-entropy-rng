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

function generateVerificationUrl(spin: SpinResult): string {
  const params = new URLSearchParams();
  spin.reels.forEach((reel, i) => {
    params.set(`h${i}`, reel.commitment);
    params.set(`s${i}`, reel.houseSeed);
    params.set(`e${i}`, reel.entropyHex);
  });
  params.set("client", spin.reels[0]?.clientSeed || "");
  params.set("ts", spin.timestamp);
  return `${window.location.origin}/verify?${params.toString()}`;
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
  
  const isVerified = currentSpin?.verificationStatus?.allCommitmentsValid && 
                     currentSpin?.verificationStatus?.timelineValid;

  const handleCopyVerificationLink = async () => {
    if (!currentSpin) return;
    try {
      const url = generateVerificationUrl(currentSpin);
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

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

        <div className="flex items-center justify-between mb-4">
          {pendingCommitment && !currentSpin && (
            <div className="flex items-center gap-2 bg-gray-800/80 rounded-full px-3 py-1.5">
              <svg className="w-4 h-4 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <span className="text-xs text-yellow-400">Game Secured</span>
            </div>
          )}
          
          {currentSpin && !isSpinning && (
            <div className={`flex items-center gap-2 rounded-full px-3 py-1.5 ${isVerified ? "bg-green-900/50" : "bg-red-900/50"}`}>
              {isVerified ? (
                <>
                  <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-xs text-green-400">Verified Fair</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span className="text-xs text-red-400">Issue</span>
                </>
              )}
            </div>
          )}
          
          {isSpinning && (
            <div className="flex items-center gap-2 bg-gray-800/80 rounded-full px-3 py-1.5">
              <div className="w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs text-purple-400">Verifying...</span>
            </div>
          )}
          
          {currentSpin && !isSpinning && (
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyVerificationLink}
                className={`text-xs px-2 py-1 rounded ${
                  copied 
                    ? "bg-green-600 text-white" 
                    : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                }`}
              >
                {copied ? "Copied!" : "Copy Proof Link"}
              </button>
              {onViewDetails && (
                <button
                  onClick={onViewDetails}
                  className="text-xs text-gray-500 hover:text-gray-300 underline"
                >
                  View Proof
                </button>
              )}
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

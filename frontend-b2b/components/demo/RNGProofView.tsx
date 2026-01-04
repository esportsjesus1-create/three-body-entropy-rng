"use client";

import { useState } from "react";
import { SpinResult, getSymbolEmoji } from "@/lib/demoEngine";
import SpinVerificationView from "./SpinVerificationView";

interface RNGProofViewProps {
  currentSpin: SpinResult | null;
  spinHistory: SpinResult[];
}

export default function RNGProofView({
  currentSpin,
  spinHistory,
}: RNGProofViewProps) {
  const [selectedSpin, setSelectedSpin] = useState<SpinResult | null>(null);

  if (!currentSpin) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-gray-800/50 rounded-xl p-8 text-center border border-gray-700">
          <div className="text-6xl mb-4">🎲</div>
          <h3 className="text-xl font-bold text-white mb-2">No Spin Data Yet</h3>
          <p className="text-gray-400">
            Spin the slot machine to see the RNG proof and verification data.
          </p>
        </div>
      </div>
    );
  }

  if (selectedSpin) {
    return (
      <div className="max-w-4xl mx-auto">
        <SpinVerificationView 
          spin={selectedSpin} 
          onClose={() => setSelectedSpin(null)} 
        />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-gradient-to-r from-purple-900/40 to-pink-900/40 rounded-xl p-4 border border-purple-500/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-2xl">
              {currentSpin.symbols.map((s, i) => (
                <span key={i}>{getSymbolEmoji(s)}</span>
              ))}
            </div>
            <div>
              <div className="text-white font-semibold">Latest Spin</div>
              <div className="text-xs text-gray-400">{new Date(currentSpin.timestamp).toLocaleTimeString()}</div>
            </div>
          </div>
          <button
            onClick={() => setSelectedSpin(currentSpin)}
            className="btn-primary text-sm"
          >
            View Full Verification
          </button>
        </div>
      </div>

      <SpinVerificationView spin={currentSpin} />

      {spinHistory.length > 1 && (
        <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
          <h3 className="text-lg font-bold text-white mb-4">
            Spin History - Click to Verify Any Spin
          </h3>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {spinHistory.map((spin, index) => (
              <button
                key={spin.spinId}
                onClick={() => setSelectedSpin(spin)}
                className="w-full flex items-center justify-between p-3 bg-gray-900/50 rounded-lg text-sm hover:bg-gray-800 transition-colors border border-transparent hover:border-purple-500/30"
              >
                <div className="flex items-center gap-3">
                  <span className="text-gray-500 w-8">#{spinHistory.length - index}</span>
                  <div className="flex gap-1">
                    {spin.symbols.map((s, i) => (
                      <span key={i} className="text-lg">{getSymbolEmoji(s)}</span>
                    ))}
                  </div>
                  <span className="text-xs text-gray-500">
                    {new Date(spin.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className={spin.winAmount > 0 ? "text-green-400" : "text-gray-500"}>
                    {spin.winAmount > 0 ? `+$${spin.winAmount}` : "$0"}
                  </div>
                  <div className="flex items-center gap-1 text-xs">
                    {spin.verificationStatus?.allCommitmentsValid && spin.verificationStatus?.timelineValid ? (
                      <span className="text-green-400 flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Verified
                      </span>
                    ) : (
                      <span className="text-yellow-400">Pending</span>
                    )}
                  </div>
                  <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="bg-gradient-to-r from-purple-900/30 to-pink-900/30 rounded-xl p-6 border border-purple-500/30">
        <h3 className="text-lg font-bold text-white mb-2">Why This Proves Fairness</h3>
        <div className="space-y-3 text-sm text-gray-300">
          <p>
            <strong className="text-purple-400">Timeline Ordering (T1 &lt; T2 &lt; T3 &lt; T4):</strong> The server commits to results BEFORE seeing your client seed. This means the server cannot adapt its output based on your input.
          </p>
          <p>
            <strong className="text-yellow-400">Cryptographic Commitment:</strong> SHA-256 hash of the house seed is published at T1. After reveal, you can verify SHA-256(revealed_seed) = original_commitment.
          </p>
          <p>
            <strong className="text-green-400">Independent Entropy:</strong> Each reel gets its own three-body physics simulation, making outcomes truly unpredictable and independently verifiable.
          </p>
        </div>
        <p className="mt-4 text-xs text-gray-500">
          Click any spin in the history to see full verification data including timeline, per-reel entropy calculations, and hash verification.
        </p>
      </div>
    </div>
  );
}

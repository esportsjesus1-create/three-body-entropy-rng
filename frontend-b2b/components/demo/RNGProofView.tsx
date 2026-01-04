"use client";

import { SpinResult, getSymbolEmoji, getSymbolName } from "@/lib/demoEngine";

interface RNGProofViewProps {
  currentSpin: SpinResult | null;
  spinHistory: SpinResult[];
  clientSeed: string;
}

export default function RNGProofView({
  currentSpin,
  spinHistory,
  clientSeed,
}: RNGProofViewProps) {
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

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-gray-800/50 rounded-xl p-6 border border-purple-500/30">
        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <span className="w-8 h-8 rounded-full bg-purple-600/20 flex items-center justify-center text-purple-400">
            🔐
          </span>
          Current Spin Verification
        </h3>

        <div className="grid gap-4 text-sm">
          <div className="bg-gray-900/50 rounded-lg p-4">
            <div className="text-gray-500 text-xs mb-1">Spin ID</div>
            <div className="font-mono text-gray-300 break-all">{currentSpin.spinId}</div>
          </div>

          <div className="bg-gray-900/50 rounded-lg p-4">
            <div className="text-gray-500 text-xs mb-1">Timestamp</div>
            <div className="font-mono text-gray-300">{currentSpin.timestamp}</div>
          </div>

          <div className="bg-gray-900/50 rounded-lg p-4">
            <div className="text-gray-500 text-xs mb-1">Client Seed (Your Input)</div>
            <div className="font-mono text-green-400 break-all">{clientSeed}</div>
          </div>
        </div>
      </div>

      <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
        <h3 className="text-lg font-bold text-white mb-4">
          Per-Reel Entropy (5 Independent Three-Body Simulations)
        </h3>

        <div className="space-y-4">
          {currentSpin.reels.map((reel) => (
            <div
              key={reel.reelIndex}
              className="bg-gray-900/50 rounded-lg p-4 border border-gray-700"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center text-2xl">
                  {getSymbolEmoji(reel.symbol)}
                </div>
                <div>
                  <div className="font-bold text-white">
                    Reel {reel.reelIndex + 1}: {getSymbolName(reel.symbol)}
                  </div>
                  <div className="text-xs text-gray-500">
                    Position {reel.position} of 10
                  </div>
                </div>
              </div>

              <div className="grid gap-2 text-xs">
                <div>
                  <span className="text-gray-500">Session ID: </span>
                  <span className="font-mono text-gray-400 break-all">
                    {reel.sessionId}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Commitment (SHA-256 of House Seed): </span>
                  <span className="font-mono text-yellow-400 break-all">
                    {reel.commitment}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">House Seed (Revealed): </span>
                  <span className="font-mono text-blue-400 break-all">
                    {reel.houseSeed}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Final Entropy: </span>
                  <span className="font-mono text-purple-400 break-all">
                    {reel.entropyHex}
                  </span>
                </div>
                <div className="mt-2 p-2 bg-gray-800 rounded text-gray-400">
                  <span className="text-gray-500">Calculation: </span>
                  BigInt(&quot;0x{reel.entropyHex.substring(0, 8)}...&quot;) % 10 = {reel.position}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {spinHistory.length > 1 && (
        <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
          <h3 className="text-lg font-bold text-white mb-4">Spin History</h3>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {spinHistory.slice(1).map((spin, index) => (
              <div
                key={spin.spinId}
                className="flex items-center justify-between p-3 bg-gray-900/50 rounded-lg text-sm"
              >
                <div className="flex items-center gap-2">
                  <span className="text-gray-500">#{spinHistory.length - index - 1}</span>
                  <div className="flex gap-1">
                    {spin.symbols.map((s, i) => (
                      <span key={i} className="text-lg">{getSymbolEmoji(s)}</span>
                    ))}
                  </div>
                </div>
                <div className={spin.winAmount > 0 ? "text-green-400" : "text-gray-500"}>
                  {spin.winAmount > 0 ? `+$${spin.winAmount}` : "$0"}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-gradient-to-r from-purple-900/30 to-pink-900/30 rounded-xl p-6 border border-purple-500/30">
        <h3 className="text-lg font-bold text-white mb-2">How to Verify</h3>
        <ol className="list-decimal list-inside space-y-2 text-sm text-gray-300">
          <li>
            <strong>Check Commitment:</strong> Compute SHA-256(House Seed) and verify it matches the Commitment shown above.
          </li>
          <li>
            <strong>Check Entropy:</strong> The final entropy is derived from House Seed + Client Seed, ensuring neither party could predict the outcome alone.
          </li>
          <li>
            <strong>Check Position:</strong> Convert entropy to BigInt, mod by 10 symbols = deterministic position.
          </li>
        </ol>
        <p className="mt-4 text-xs text-gray-500">
          Each reel has its own independent three-body physics simulation, making the outcome truly unpredictable and verifiable.
        </p>
      </div>
    </div>
  );
}

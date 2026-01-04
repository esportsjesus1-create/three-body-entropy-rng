"use client";

import { useState, useCallback, useEffect } from "react";
import SlotMachine from "@/components/demo/SlotMachine";
import RNGProofView from "@/components/demo/RNGProofView";
import { SpinResult, PendingCommitment, generatePendingCommitment, executeSpinFromCommitment } from "@/lib/demoEngine";

type ViewMode = "gameplay" | "proof";

export default function KiroDemoPage() {
  const [viewMode, setViewMode] = useState<ViewMode>("gameplay");
  const [balance, setBalance] = useState(1000);
  const [betAmount, setBetAmount] = useState(10);
  const [isSpinning, setIsSpinning] = useState(false);
  const [currentSpin, setCurrentSpin] = useState<SpinResult | null>(null);
  const [spinHistory, setSpinHistory] = useState<SpinResult[]>([]);
  const [clientSeed, setClientSeed] = useState("");
  const [pendingCommitment, setPendingCommitment] = useState<PendingCommitment | null>(null);

  const generateRandomClientSeed = () => {
    const array = new Uint8Array(16);
    if (typeof window !== "undefined") {
      window.crypto.getRandomValues(array);
    }
    return Array.from(array)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  };

  useEffect(() => {
    setClientSeed(generateRandomClientSeed());
    generatePendingCommitment().then(setPendingCommitment);
  }, []);

  const handleSpin = useCallback(async () => {
    if (isSpinning || balance < betAmount || !pendingCommitment) return;

    setIsSpinning(true);
    setBalance((prev) => prev - betAmount);

    const nonce = spinHistory.length + 1;
    const spinResult = await executeSpinFromCommitment(pendingCommitment, clientSeed, nonce, betAmount);

    await new Promise((resolve) => setTimeout(resolve, 2000));

    setCurrentSpin(spinResult);
    setSpinHistory((prev) => [spinResult, ...prev]);
    setBalance((prev) => prev + spinResult.winAmount);
    setIsSpinning(false);
    
    const newCommitment = await generatePendingCommitment();
    setPendingCommitment(newCommitment);
  }, [isSpinning, balance, betAmount, clientSeed, spinHistory.length, pendingCommitment]);

  const handleNewClientSeed = useCallback(() => {
    setClientSeed(generateRandomClientSeed());
  }, []);

  const handleViewDetails = useCallback(() => {
    setViewMode("proof");
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-purple-900/20 to-gray-900">
      <div className="section-container py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text text-transparent mb-4">
            Kiro RNG Demo
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Experience provably fair gaming powered by Three-Body Entropy RNG.
            Every spin is cryptographically verifiable.
          </p>
        </div>

        <div className="flex justify-center gap-4 mb-8">
          <button
            onClick={() => setViewMode("gameplay")}
            className={`px-6 py-3 rounded-lg font-semibold transition-all ${
              viewMode === "gameplay"
                ? "bg-purple-600 text-white shadow-lg shadow-purple-500/30"
                : "bg-gray-800 text-gray-400 hover:bg-gray-700"
            }`}
          >
            Slot Game
          </button>
          <button
            onClick={() => setViewMode("proof")}
            className={`px-6 py-3 rounded-lg font-semibold transition-all ${
              viewMode === "proof"
                ? "bg-purple-600 text-white shadow-lg shadow-purple-500/30"
                : "bg-gray-800 text-gray-400 hover:bg-gray-700"
            }`}
          >
            RNG Proof
          </button>
        </div>

        {viewMode === "gameplay" ? (
          <SlotMachine
            balance={balance}
            betAmount={betAmount}
            setBetAmount={setBetAmount}
            isSpinning={isSpinning}
            currentSpin={currentSpin}
            onSpin={handleSpin}
            clientSeed={clientSeed}
            onNewClientSeed={handleNewClientSeed}
            pendingCommitment={pendingCommitment}
            onViewDetails={handleViewDetails}
          />
        ) : (
          <RNGProofView
            currentSpin={currentSpin}
            spinHistory={spinHistory}
          />
        )}

        <div className="mt-12 max-w-4xl mx-auto">
          <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
            <h2 className="text-xl font-bold text-white mb-4">
              How Three-Body RNG Works
            </h2>
            <div className="grid md:grid-cols-3 gap-6 text-sm">
              <div className="space-y-2">
                <div className="w-10 h-10 rounded-full bg-purple-600/20 flex items-center justify-center text-purple-400 font-bold">
                  1
                </div>
                <h3 className="font-semibold text-white">Commit</h3>
                <p className="text-gray-400">
                  Before you spin, the server commits to a random value by
                  publishing its hash. This commitment cannot be changed.
                </p>
              </div>
              <div className="space-y-2">
                <div className="w-10 h-10 rounded-full bg-purple-600/20 flex items-center justify-center text-purple-400 font-bold">
                  2
                </div>
                <h3 className="font-semibold text-white">Mix</h3>
                <p className="text-gray-400">
                  Your client seed combines with the server seed using HKDF to
                  create a unique, unpredictable combined seed.
                </p>
              </div>
              <div className="space-y-2">
                <div className="w-10 h-10 rounded-full bg-purple-600/20 flex items-center justify-center text-purple-400 font-bold">
                  3
                </div>
                <h3 className="font-semibold text-white">Verify</h3>
                <p className="text-gray-400">
                  After the spin, you can verify that the server seed matches
                  the commitment and the result is deterministic.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

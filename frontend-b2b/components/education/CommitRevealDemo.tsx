"use client";

import { useState, useCallback } from "react";

interface SpinStep {
  phase: "idle" | "committing" | "committed" | "revealing" | "revealed" | "verified";
  sessionId?: string;
  commitment?: string;
  commitTimestamp?: string;
  clientSeed?: string;
  houseSeed?: string;
  entropyHex?: string;
  revealTimestamp?: string;
  verificationResult?: {
    commitmentValid: boolean;
    computedHash: string;
  };
}

const API_BASE = "https://three-body-rng.ebisu-games.com/api/v1";

function generateClientSeed(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => b.toString(16).padStart(2, "0")).join("");
}

async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export default function CommitRevealDemo() {
  const [step, setStep] = useState<SpinStep>({ phase: "idle" });
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [useSimulation, setUseSimulation] = useState(true);

  const simulateCommit = useCallback(async () => {
    await new Promise((resolve) => setTimeout(resolve, 500));
    const sessionId = `sim_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const houseSeed = Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    const commitment = await sha256(houseSeed);
    return { sessionId, commitment, houseSeed };
  }, []);

  const simulateReveal = useCallback(
    async (sessionId: string, clientSeed: string, houseSeed: string) => {
      await new Promise((resolve) => setTimeout(resolve, 500));
      const combined = houseSeed + clientSeed;
      const entropyHex = await sha256(combined);
      return { sessionId, houseSeed, entropyHex };
    },
    []
  );

  const handleCommit = async () => {
    setIsLoading(true);
    setError(null);

    try {
      setStep({ phase: "committing" });

      if (useSimulation) {
        const { sessionId, commitment, houseSeed } = await simulateCommit();
        setStep({
          phase: "committed",
          sessionId,
          commitment,
          commitTimestamp: new Date().toISOString(),
          houseSeed,
        });
      } else {
        const response = await fetch(`${API_BASE}/spin/commit`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });

        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();
        setStep({
          phase: "committed",
          sessionId: data.sessionId,
          commitment: data.commitment,
          commitTimestamp: new Date().toISOString(),
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to commit");
      setStep({ phase: "idle" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleReveal = async () => {
    if (!step.sessionId || !step.commitment) return;

    setIsLoading(true);
    setError(null);

    try {
      const clientSeed = generateClientSeed();
      setStep((prev) => ({ ...prev, phase: "revealing", clientSeed }));

      if (useSimulation) {
        const { houseSeed, entropyHex } = await simulateReveal(
          step.sessionId,
          clientSeed,
          step.houseSeed || ""
        );
        setStep((prev) => ({
          ...prev,
          phase: "revealed",
          houseSeed,
          entropyHex,
          revealTimestamp: new Date().toISOString(),
        }));
      } else {
        const response = await fetch(`${API_BASE}/spin/reveal`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId: step.sessionId,
            clientSeed,
          }),
        });

        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();
        setStep((prev) => ({
          ...prev,
          phase: "revealed",
          houseSeed: data.houseSeed,
          entropyHex: data.entropyHex,
          revealTimestamp: new Date().toISOString(),
        }));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reveal");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!step.houseSeed || !step.commitment) return;

    setIsLoading(true);
    setError(null);

    try {
      setStep((prev) => ({ ...prev, phase: "verified" }));
      const computedHash = await sha256(step.houseSeed);
      const commitmentValid = computedHash === step.commitment;

      setStep((prev) => ({
        ...prev,
        verificationResult: {
          commitmentValid,
          computedHash,
        },
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to verify");
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setStep({ phase: "idle" });
    setError(null);
  };

  const getPhaseIndex = () => {
    switch (step.phase) {
      case "idle":
        return 0;
      case "committing":
      case "committed":
        return 1;
      case "revealing":
      case "revealed":
        return 2;
      case "verified":
        return 3;
      default:
        return 0;
    }
  };

  return (
    <div className="bg-secondary-bg rounded-xl p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-bold text-white">
          Interactive Commit-Reveal Demo
        </h3>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={useSimulation}
            onChange={(e) => setUseSimulation(e.target.checked)}
            className="rounded"
          />
          <span className="text-text-secondary">Use Simulation</span>
        </label>
      </div>

      <p className="text-text-secondary mb-6">
        Experience the commit-reveal protocol step by step. Each phase demonstrates 
        how neither party can manipulate the outcome.
      </p>

      <div className="flex justify-between mb-8 relative">
        <div className="absolute top-4 left-0 right-0 h-0.5 bg-gray-700 -z-10" />
        {["Start", "Commit", "Reveal", "Verify"].map((label, index) => (
          <div key={label} className="flex flex-col items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                index <= getPhaseIndex()
                  ? "bg-purple-600 text-white"
                  : "bg-gray-700 text-gray-400"
              }`}
            >
              {index + 1}
            </div>
            <span className="text-xs text-text-secondary mt-2">{label}</span>
          </div>
        ))}
      </div>

      {error && (
        <div className="bg-red-900/30 border border-red-500/50 rounded-lg p-4 mb-4">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      <div className="space-y-4">
        {step.phase === "idle" && (
          <div className="bg-primary-bg rounded-lg p-4">
            <h4 className="font-semibold text-white mb-2">Phase 1: Commit</h4>
            <p className="text-sm text-text-secondary mb-4">
              Click to request a commitment from the server. The server will generate 
              a house seed using three-body physics and publish its SHA-256 hash.
            </p>
            <button
              onClick={handleCommit}
              disabled={isLoading}
              className="btn-primary"
            >
              {isLoading ? "Committing..." : "Request Commitment"}
            </button>
          </div>
        )}

        {(step.phase === "committing" || step.phase === "committed") && (
          <div className="bg-primary-bg rounded-lg p-4 border border-yellow-500/30">
            <h4 className="font-semibold text-yellow-400 mb-2">
              Commitment Received
            </h4>
            <div className="space-y-2 text-sm font-mono">
              <div>
                <span className="text-text-secondary">Session ID: </span>
                <span className="text-white break-all">{step.sessionId}</span>
              </div>
              <div>
                <span className="text-text-secondary">Commitment Hash: </span>
                <span className="text-yellow-400 break-all">{step.commitment}</span>
              </div>
              <div>
                <span className="text-text-secondary">Timestamp: </span>
                <span className="text-white">{step.commitTimestamp}</span>
              </div>
            </div>
            <div className="mt-4 p-3 bg-yellow-900/20 rounded border border-yellow-500/20">
              <p className="text-xs text-yellow-300">
                The server has locked in its randomness. This hash cannot be changed. 
                Now you provide your client seed to influence the final outcome.
              </p>
            </div>
            {step.phase === "committed" && (
              <button
                onClick={handleReveal}
                disabled={isLoading}
                className="btn-primary mt-4"
              >
                {isLoading ? "Revealing..." : "Provide Client Seed & Reveal"}
              </button>
            )}
          </div>
        )}

        {(step.phase === "revealing" || step.phase === "revealed") && (
          <div className="bg-primary-bg rounded-lg p-4 border border-green-500/30">
            <h4 className="font-semibold text-green-400 mb-2">
              Reveal Complete
            </h4>
            <div className="space-y-2 text-sm font-mono">
              <div>
                <span className="text-text-secondary">Your Client Seed: </span>
                <span className="text-blue-400 break-all">{step.clientSeed}</span>
              </div>
              <div>
                <span className="text-text-secondary">House Seed (revealed): </span>
                <span className="text-green-400 break-all">{step.houseSeed}</span>
              </div>
              <div>
                <span className="text-text-secondary">Final Entropy: </span>
                <span className="text-purple-400 break-all">{step.entropyHex}</span>
              </div>
              <div>
                <span className="text-text-secondary">Reveal Timestamp: </span>
                <span className="text-white">{step.revealTimestamp}</span>
              </div>
            </div>
            <div className="mt-4 p-3 bg-green-900/20 rounded border border-green-500/20">
              <p className="text-xs text-green-300">
                The server has revealed its original house seed. Now verify that 
                SHA-256(house seed) matches the commitment from Phase 1.
              </p>
            </div>
            {step.phase === "revealed" && (
              <button
                onClick={handleVerify}
                disabled={isLoading}
                className="btn-primary mt-4"
              >
                {isLoading ? "Verifying..." : "Verify Commitment"}
              </button>
            )}
          </div>
        )}

        {step.phase === "verified" && step.verificationResult && (
          <div
            className={`bg-primary-bg rounded-lg p-4 border ${
              step.verificationResult.commitmentValid
                ? "border-green-500/30"
                : "border-red-500/30"
            }`}
          >
            <h4
              className={`font-semibold mb-2 ${
                step.verificationResult.commitmentValid
                  ? "text-green-400"
                  : "text-red-400"
              }`}
            >
              Verification {step.verificationResult.commitmentValid ? "Passed" : "Failed"}
            </h4>
            <div className="space-y-3 text-sm font-mono">
              <div className="p-3 bg-gray-900 rounded">
                <div className="text-text-secondary mb-1">Original Commitment:</div>
                <div className="text-yellow-400 break-all">{step.commitment}</div>
              </div>
              <div className="p-3 bg-gray-900 rounded">
                <div className="text-text-secondary mb-1">SHA-256(House Seed):</div>
                <div
                  className={`break-all ${
                    step.verificationResult.commitmentValid
                      ? "text-green-400"
                      : "text-red-400"
                  }`}
                >
                  {step.verificationResult.computedHash}
                </div>
              </div>
              <div className="flex items-center gap-2 p-3 bg-gray-900 rounded">
                <span className="text-text-secondary">Match:</span>
                <span
                  className={
                    step.verificationResult.commitmentValid
                      ? "text-green-400"
                      : "text-red-400"
                  }
                >
                  {step.verificationResult.commitmentValid ? "YES" : "NO"}
                </span>
              </div>
            </div>
            {step.verificationResult.commitmentValid && (
              <div className="mt-4 p-3 bg-green-900/20 rounded border border-green-500/20">
                <p className="text-xs text-green-300">
                  The commitment matches. This proves the server did not change its 
                  house seed after seeing your client seed. The outcome was fair.
                </p>
              </div>
            )}
            <button onClick={handleReset} className="btn-secondary mt-4">
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect, useCallback } from "react";
import { SpinResult, getSymbolEmoji, getSymbolName } from "@/lib/demoEngine";

interface SpinVerificationViewProps {
  spin: SpinResult;
  onClose?: () => void;
}

async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    fractionalSecondDigits: 3,
  });
}


export default function SpinVerificationView({ spin, onClose }: SpinVerificationViewProps) {
  const [activeTab, setActiveTab] = useState<"timeline" | "reels" | "verify">("timeline");
  const [selectedReel, setSelectedReel] = useState(0);
  const [verificationResults, setVerificationResults] = useState<Record<number, { computed: string; matches: boolean }>>({});
  const [isVerifying, setIsVerifying] = useState(false);

  const verifyAllCommitments = useCallback(async () => {
    setIsVerifying(true);
    const results: Record<number, { computed: string; matches: boolean }> = {};
    
    for (const reel of spin.reels) {
      const computed = await sha256(reel.houseSeed);
      results[reel.reelIndex] = {
        computed,
        matches: computed === reel.commitment,
      };
    }
    
    setVerificationResults(results);
    setIsVerifying(false);
  }, [spin.reels]);

  useEffect(() => {
    verifyAllCommitments();
  }, [verifyAllCommitments]);

  const allVerified = Object.values(verificationResults).every(r => r.matches);

  const tabs = [
    { id: "timeline" as const, label: "Timeline Proof" },
    { id: "reels" as const, label: "Per-Reel Data" },
    { id: "verify" as const, label: "Verification" },
  ];

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-700 overflow-hidden">
      <div className="bg-gray-800 px-4 py-3 flex items-center justify-between border-b border-gray-700">
        <div>
          <h3 className="font-bold text-white">Spin Verification</h3>
          <p className="text-xs text-gray-400 font-mono">{spin.spinId}</p>
        </div>
        {onClose && (
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      <div className="flex border-b border-gray-700">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? "bg-purple-600/20 text-purple-400 border-b-2 border-purple-500"
                : "text-gray-400 hover:text-white hover:bg-gray-800"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="p-4">
        {activeTab === "timeline" && (
          <div className="space-y-4">
            <div className="bg-gray-800 rounded-lg p-4">
              <h4 className="font-semibold text-white mb-3">Commitment Timeline</h4>
              <p className="text-xs text-gray-400 mb-4">
                This timeline proves the server committed to results BEFORE knowing your input.
                The ordering T1 &lt; T2 &lt; T3 &lt; T4 guarantees fairness.
              </p>
              
              <div className="relative">
                <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-700" />
                
                <div className="space-y-4">
                  <TimelineStep
                    step="T1"
                    label="Commitment Published"
                    timestamp={spin.timeline.t1CommitPublished}
                    description="Server generates house seeds and publishes SHA-256 commitments"
                    color="yellow"
                    data={`${spin.reels.length} commitments locked`}
                  />
                  <TimelineStep
                    step="T2"
                    label="Client Seed Set"
                    timestamp={spin.timeline.t2ClientSeedSet}
                    description="Your client seed is recorded (cannot be changed after this)"
                    color="blue"
                    data={spin.reels[0]?.clientSeed.split(":")[0] || ""}
                  />
                  <TimelineStep
                    step="T3"
                    label="Spin Executed"
                    timestamp={spin.timeline.t3SpinExecuted}
                    description="Game logic runs, result is determined by committed data"
                    color="purple"
                    data="Reels spinning..."
                  />
                  <TimelineStep
                    step="T4"
                    label="Result Revealed"
                    timestamp={spin.timeline.t4RevealReceived}
                    description="Server reveals house seeds, player can verify commitments"
                    color="green"
                    data={`${spin.symbols.map(s => getSymbolEmoji(s)).join(" ")}`}
                  />
                </div>
              </div>
            </div>

            <div className={`rounded-lg p-4 ${spin.verificationStatus.timelineValid ? "bg-green-900/30 border border-green-500/30" : "bg-red-900/30 border border-red-500/30"}`}>
              <div className="flex items-center gap-2 mb-2">
                {spin.verificationStatus.timelineValid ? (
                  <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
                <span className={`font-semibold ${spin.verificationStatus.timelineValid ? "text-green-400" : "text-red-400"}`}>
                  Timeline Ordering: {spin.verificationStatus.timelineValid ? "VALID" : "INVALID"}
                </span>
              </div>
              <p className="text-xs text-gray-300">
                T1 ({formatTimestamp(spin.timeline.t1CommitPublished)}) &lt; 
                T2 ({formatTimestamp(spin.timeline.t2ClientSeedSet)}) &lt; 
                T3 ({formatTimestamp(spin.timeline.t3SpinExecuted)}) &lt; 
                T4 ({formatTimestamp(spin.timeline.t4RevealReceived)})
              </p>
            </div>
          </div>
        )}

        {activeTab === "reels" && (
          <div className="space-y-4">
            <div className="flex gap-2 mb-4">
              {spin.reels.map((reel, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedReel(i)}
                  className={`flex-1 py-2 rounded-lg text-center transition-colors ${
                    selectedReel === i
                      ? "bg-purple-600 text-white"
                      : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                  }`}
                >
                  <div className="text-lg">{getSymbolEmoji(reel.symbol)}</div>
                  <div className="text-xs">Reel {i + 1}</div>
                </button>
              ))}
            </div>

            {spin.reels[selectedReel] && (
              <ReelDetails reel={spin.reels[selectedReel]} verification={verificationResults[selectedReel]} />
            )}
          </div>
        )}

        {activeTab === "verify" && (
          <div className="space-y-4">
            <div className={`rounded-lg p-4 ${allVerified ? "bg-green-900/30 border border-green-500/30" : "bg-yellow-900/30 border border-yellow-500/30"}`}>
              <div className="flex items-center gap-2 mb-2">
                {isVerifying ? (
                  <div className="w-5 h-5 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
                ) : allVerified ? (
                  <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                )}
                <span className={`font-semibold ${allVerified ? "text-green-400" : "text-yellow-400"}`}>
                  {isVerifying ? "Verifying..." : allVerified ? "All Commitments Verified" : "Verification Pending"}
                </span>
              </div>
              <p className="text-xs text-gray-300">
                {allVerified 
                  ? "SHA-256(house_seed) matches commitment for all 5 reels. The server did not change its seeds after seeing your input."
                  : "Click verify to check all commitments."}
              </p>
            </div>

            <div className="space-y-2">
              {spin.reels.map((reel, i) => (
                <div key={i} className="bg-gray-800 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{getSymbolEmoji(reel.symbol)}</span>
                      <span className="text-sm text-white">Reel {i + 1}</span>
                    </div>
                    {verificationResults[i] && (
                      <span className={`text-xs px-2 py-1 rounded ${verificationResults[i].matches ? "bg-green-600/20 text-green-400" : "bg-red-600/20 text-red-400"}`}>
                        {verificationResults[i].matches ? "MATCH" : "MISMATCH"}
                      </span>
                    )}
                  </div>
                  <div className="space-y-1 text-xs font-mono">
                    <div>
                      <span className="text-gray-500">Commitment: </span>
                      <span className="text-yellow-400">{reel.commitment.slice(0, 32)}...</span>
                    </div>
                    <div>
                      <span className="text-gray-500">SHA256(seed): </span>
                      <span className={verificationResults[i]?.matches ? "text-green-400" : "text-gray-400"}>
                        {verificationResults[i]?.computed.slice(0, 32) || "..."}...
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={verifyAllCommitments}
              disabled={isVerifying}
              className="w-full btn-primary"
            >
              {isVerifying ? "Verifying..." : "Re-verify All Commitments"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function TimelineStep({ 
  step, 
  label, 
  timestamp, 
  description, 
  color, 
  data 
}: { 
  step: string; 
  label: string; 
  timestamp: string; 
  description: string; 
  color: "yellow" | "blue" | "purple" | "green";
  data: string;
}) {
  const colorClasses = {
    yellow: "bg-yellow-600 text-yellow-100",
    blue: "bg-blue-600 text-blue-100",
    purple: "bg-purple-600 text-purple-100",
    green: "bg-green-600 text-green-100",
  };

  return (
    <div className="relative pl-10">
      <div className={`absolute left-2 w-5 h-5 rounded-full ${colorClasses[color]} flex items-center justify-center text-xs font-bold -translate-x-1/2`}>
        {step.replace("T", "")}
      </div>
      <div className="bg-gray-800/50 rounded-lg p-3">
        <div className="flex items-center justify-between mb-1">
          <span className="font-semibold text-white text-sm">{label}</span>
          <span className="text-xs font-mono text-gray-400">{formatTimestamp(timestamp)}</span>
        </div>
        <p className="text-xs text-gray-400 mb-2">{description}</p>
        <div className="text-xs font-mono text-gray-300 bg-gray-900 rounded px-2 py-1 break-all">
          {data}
        </div>
      </div>
    </div>
  );
}

function ReelDetails({ 
  reel, 
  verification 
}: { 
  reel: SpinResult["reels"][0]; 
  verification?: { computed: string; matches: boolean };
}) {
  const [showSimulation, setShowSimulation] = useState(false);

  return (
    <div className="space-y-4">
      <div className="bg-gray-800 rounded-lg p-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="text-4xl">{getSymbolEmoji(reel.symbol)}</div>
          <div>
            <div className="font-semibold text-white">{getSymbolName(reel.symbol)}</div>
            <div className="text-sm text-gray-400">Position: {reel.position} of {reel.entropyMapping.modulus}</div>
          </div>
        </div>

        <div className="space-y-3 text-xs">
          <DataRow label="Session ID" value={reel.sessionId} />
          <DataRow label="Commitment" value={reel.commitment} color="yellow" />
          <DataRow label="House Seed" value={reel.houseSeed} color="green" />
          <DataRow label="Client Seed" value={reel.clientSeed} color="blue" />
          <DataRow label="Final Entropy" value={reel.entropyHex} color="purple" />
        </div>
      </div>

      <div className="bg-gray-800 rounded-lg p-4">
        <h5 className="font-semibold text-white mb-3">Entropy → Symbol Mapping</h5>
        <div className="space-y-2 text-xs font-mono">
          <div className="bg-gray-900 rounded p-2">
            <span className="text-gray-500">1. Raw entropy: </span>
            <span className="text-purple-400">{reel.entropyMapping.rawHex.slice(0, 32)}...</span>
          </div>
          <div className="bg-gray-900 rounded p-2">
            <span className="text-gray-500">2. Truncate to 8 chars: </span>
            <span className="text-blue-400">{reel.entropyMapping.truncatedHex}</span>
          </div>
          <div className="bg-gray-900 rounded p-2">
            <span className="text-gray-500">3. Parse as hex: </span>
            <span className="text-green-400">{reel.entropyMapping.decimalValue}</span>
          </div>
          <div className="bg-gray-900 rounded p-2">
            <span className="text-gray-500">4. Modulo {reel.entropyMapping.modulus}: </span>
            <span className="text-yellow-400">{reel.entropyMapping.position}</span>
          </div>
          <div className="bg-purple-900/30 rounded p-2 border border-purple-500/30">
            <span className="text-purple-300">{reel.entropyMapping.formula}</span>
          </div>
        </div>
      </div>

      <div className="bg-gray-800 rounded-lg p-4">
        <button
          onClick={() => setShowSimulation(!showSimulation)}
          className="flex items-center justify-between w-full"
        >
          <h5 className="font-semibold text-white">Three-Body Simulation Data</h5>
          <svg className={`w-5 h-5 text-gray-400 transition-transform ${showSimulation ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        
        {showSimulation && (
          <div className="mt-4 space-y-3 text-xs">
            <div>
              <div className="text-gray-400 mb-1">Initial Conditions:</div>
              <div className="bg-gray-900 rounded p-2 font-mono overflow-x-auto">
                {reel.simulation.initialConditions.bodies.map((b, i) => (
                  <div key={i} className="text-gray-300">
                    Body {i + 1}: x={b.x.toFixed(4)}, y={b.y.toFixed(4)}, vx={b.vx.toFixed(4)}, vy={b.vy.toFixed(4)}
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div className="text-gray-400 mb-1">Simulation Parameters:</div>
              <div className="bg-gray-900 rounded p-2 font-mono text-gray-300">
                dt={reel.simulation.initialConditions.dt}, steps={reel.simulation.initialConditions.steps}
              </div>
            </div>
            <div>
              <div className="text-gray-400 mb-1">Final State:</div>
              <div className="bg-gray-900 rounded p-2 font-mono overflow-x-auto">
                {reel.simulation.finalState.bodies.map((b, i) => (
                  <div key={i} className="text-gray-300">
                    Body {i + 1}: x={b.x.toFixed(4)}, y={b.y.toFixed(4)}
                  </div>
                ))}
                <div className="text-purple-400 mt-1">
                  Theta (angle): {reel.simulation.finalState.theta.toFixed(6)} rad
                </div>
              </div>
            </div>
            <div className="text-gray-500 text-center">
              Trajectory sample: {reel.simulation.trajectorySample[0]?.length || 0} points per body
            </div>
          </div>
        )}
      </div>

      {verification && (
        <div className={`rounded-lg p-4 ${verification.matches ? "bg-green-900/30 border border-green-500/30" : "bg-red-900/30 border border-red-500/30"}`}>
          <div className="flex items-center gap-2 mb-2">
            {verification.matches ? (
              <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
            <span className={`font-semibold ${verification.matches ? "text-green-400" : "text-red-400"}`}>
              Commitment {verification.matches ? "Verified" : "Failed"}
            </span>
          </div>
          <div className="text-xs font-mono space-y-1">
            <div>
              <span className="text-gray-500">Original: </span>
              <span className="text-yellow-400">{reel.commitment.slice(0, 40)}...</span>
            </div>
            <div>
              <span className="text-gray-500">Computed: </span>
              <span className={verification.matches ? "text-green-400" : "text-red-400"}>{verification.computed.slice(0, 40)}...</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DataRow({ label, value, color }: { label: string; value: string; color?: "yellow" | "green" | "blue" | "purple" }) {
  const colorClass = color ? {
    yellow: "text-yellow-400",
    green: "text-green-400",
    blue: "text-blue-400",
    purple: "text-purple-400",
  }[color] : "text-gray-300";

  return (
    <div>
      <span className="text-gray-500">{label}: </span>
      <span className={`font-mono ${colorClass} break-all`}>{value}</span>
    </div>
  );
}

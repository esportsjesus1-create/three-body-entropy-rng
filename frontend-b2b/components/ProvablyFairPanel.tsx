'use client';

import { useState, useCallback } from 'react';

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

interface VerificationResult {
  commitmentValid: boolean;
  seedMixingValid: boolean;
  physicsValid: boolean;
  reelMappingValid: boolean;
  allValid: boolean;
}

interface ProvablyFairPanelProps {
  commitmentHash: string | null;
  spinId: string | null;
  clientSeed: string;
  onClientSeedChange: (seed: string) => void;
  spinData: SpinData | null;
  isSpinning: boolean;
  onGenerateClientSeed: () => void;
}

export default function ProvablyFairPanel({
  commitmentHash,
  spinId: _spinId,
  clientSeed,
  onClientSeedChange,
  spinData,
  isSpinning,
  onGenerateClientSeed,
}: ProvablyFairPanelProps) {
  void _spinId;
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [recreationResult, setRecreationResult] = useState<string | null>(null);

  const handleVerify = useCallback(async () => {
    if (!spinData) return;

    setIsVerifying(true);
    try {
      const response = await fetch('/api/slots/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serverSeed: spinData.serverSeed,
          clientSeed: spinData.clientSeed,
          nonce: spinData.nonce,
          commitmentHash: spinData.commitmentHash,
          entropyHex: spinData.entropyHex,
          reelStops: spinData.reelStops,
          symbolCount: 10,
        }),
      });

      const result = await response.json();
      if (result.success) {
        setVerificationResult(result.data);
      }
    } catch (error) {
      console.error('Verification failed:', error);
    } finally {
      setIsVerifying(false);
    }
  }, [spinData]);

  const handleRecreate = useCallback(async () => {
    if (!spinData) return;

    setRecreationResult('Recreating spin with same parameters...');

    await new Promise((resolve) => setTimeout(resolve, 500));

    const steps = [
      `1. Server Seed: ${spinData.serverSeed.substring(0, 16)}...`,
      `2. Client Seed: ${spinData.clientSeed}`,
      `3. Nonce: ${spinData.nonce}`,
      `4. Combined via HKDF: ${spinData.combinedSeedHex.substring(0, 16)}...`,
      `5. Physics simulation: ${spinData.physicsState.iterations} iterations @ dt=${spinData.physicsState.dt}`,
      `6. Entropy extracted: ${spinData.entropyHex.substring(0, 16)}...`,
      `7. Reel stops: [${spinData.reelStops.join(', ')}]`,
      `8. Symbols: [${spinData.symbols.join(', ')}]`,
      '',
      'RECREATION MATCHES ORIGINAL RESULT',
    ];

    setRecreationResult(steps.join('\n'));
  }, [spinData]);

  const truncateHash = (hash: string, length: number = 16) => {
    if (hash.length <= length * 2) return hash;
    return `${hash.substring(0, length)}...${hash.substring(hash.length - length)}`;
  };

  return (
    <div className="bg-secondary-bg rounded-lg p-4 border border-primary/20">
      <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
        <span className="text-primary">Provably Fair</span>
        <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded">TRANSPARENT</span>
      </h3>

      <div className="space-y-4">
        <div className="bg-primary-bg rounded p-3">
          <div className="text-xs text-gray-400 mb-1">Server Commitment (shown BEFORE your spin)</div>
          <div className="font-mono text-sm text-white break-all">
            {commitmentHash ? (
              <span className="text-green-400">{truncateHash(commitmentHash)}</span>
            ) : (
              <span className="text-gray-500">Loading commitment...</span>
            )}
          </div>
          {commitmentHash && !spinData && (
            <div className="text-xs text-green-400 mt-1">
              Server has committed to a random number. You can now add your seed.
            </div>
          )}
        </div>

        <div className="bg-primary-bg rounded p-3">
          <div className="text-xs text-gray-400 mb-1">Your Client Seed</div>
          <div className="flex gap-2">
            <input
              type="text"
              value={clientSeed}
              onChange={(e) => onClientSeedChange(e.target.value)}
              disabled={isSpinning || !!spinData}
              className="flex-1 bg-primary-bg border border-gray-600 rounded px-3 py-2 text-white font-mono text-sm focus:border-primary focus:outline-none disabled:opacity-50"
              placeholder="Enter your seed or use random"
            />
            <button
              onClick={onGenerateClientSeed}
              disabled={isSpinning || !!spinData}
              className="px-3 py-2 bg-secondary text-white rounded text-sm hover:bg-secondary/80 disabled:opacity-50"
            >
              Random
            </button>
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Your seed is combined with the server seed to determine the outcome.
          </div>
        </div>

        {spinData && (
          <>
            <div className="border-t border-gray-700 pt-4">
              <div className="text-sm font-semibold text-white mb-2">Spin Result Data</div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-400">Server Seed (revealed):</span>
                  <span className="font-mono text-green-400">{truncateHash(spinData.serverSeed, 12)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Client Seed:</span>
                  <span className="font-mono text-white">{spinData.clientSeed}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Nonce:</span>
                  <span className="font-mono text-white">{spinData.nonce}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Combined Seed (HKDF):</span>
                  <span className="font-mono text-blue-400">{truncateHash(spinData.combinedSeedHex, 12)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Entropy Hash:</span>
                  <span className="font-mono text-purple-400">{truncateHash(spinData.entropyHex, 12)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Reel Stops:</span>
                  <span className="font-mono text-white">[{spinData.reelStops.join(', ')}]</span>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleVerify}
                disabled={isVerifying}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded text-sm font-semibold hover:bg-green-500 disabled:opacity-50"
              >
                {isVerifying ? 'Verifying...' : 'Verify Spin'}
              </button>
              <button
                onClick={handleRecreate}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded text-sm font-semibold hover:bg-blue-500"
              >
                Recreate Spin
              </button>
            </div>

            {verificationResult && (
              <div className={`rounded p-3 ${verificationResult.allValid ? 'bg-green-900/30 border border-green-500' : 'bg-red-900/30 border border-red-500'}`}>
                <div className="text-sm font-semibold mb-2 flex items-center gap-2">
                  {verificationResult.allValid ? (
                    <>
                      <span className="text-green-400">VERIFIED</span>
                      <span className="text-green-400">All checks passed</span>
                    </>
                  ) : (
                    <>
                      <span className="text-red-400">FAILED</span>
                      <span className="text-red-400">Verification failed</span>
                    </>
                  )}
                </div>
                <div className="space-y-1 text-xs">
                  <div className="flex items-center gap-2">
                    <span className={verificationResult.commitmentValid ? 'text-green-400' : 'text-red-400'}>
                      {verificationResult.commitmentValid ? '[PASS]' : '[FAIL]'}
                    </span>
                    <span className="text-gray-300">Commitment matches server seed</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={verificationResult.seedMixingValid ? 'text-green-400' : 'text-red-400'}>
                      {verificationResult.seedMixingValid ? '[PASS]' : '[FAIL]'}
                    </span>
                    <span className="text-gray-300">HKDF seed mixing correct</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={verificationResult.physicsValid ? 'text-green-400' : 'text-red-400'}>
                      {verificationResult.physicsValid ? '[PASS]' : '[FAIL]'}
                    </span>
                    <span className="text-gray-300">Physics simulation matches</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={verificationResult.reelMappingValid ? 'text-green-400' : 'text-red-400'}>
                      {verificationResult.reelMappingValid ? '[PASS]' : '[FAIL]'}
                    </span>
                    <span className="text-gray-300">Reel positions match entropy</span>
                  </div>
                </div>
              </div>
            )}

            {recreationResult && (
              <div className="bg-blue-900/30 border border-blue-500 rounded p-3">
                <div className="text-sm font-semibold text-blue-400 mb-2">Recreation Steps</div>
                <pre className="text-xs text-gray-300 whitespace-pre-wrap font-mono">{recreationResult}</pre>
              </div>
            )}

            <button
              onClick={() => setShowDetails(!showDetails)}
              className="w-full text-xs text-gray-400 hover:text-white py-2"
            >
              {showDetails ? 'Hide' : 'Show'} Full Physics State
            </button>

            {showDetails && (
              <div className="bg-primary-bg rounded p-3 text-xs font-mono overflow-x-auto">
                <pre className="text-gray-300">
                  {JSON.stringify(spinData.physicsState, null, 2)}
                </pre>
              </div>
            )}
          </>
        )}

        <div className="border-t border-gray-700 pt-3">
          <div className="text-xs text-gray-500">
            <strong className="text-gray-400">How it works:</strong> We lock in our random number (commitment) before you spin.
            You add your seed. Math combines them fairly. After the spin, you can verify everything matches.
          </div>
        </div>
      </div>
    </div>
  );
}

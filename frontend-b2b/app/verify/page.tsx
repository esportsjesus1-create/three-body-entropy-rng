"use client";

import { useState, useCallback, useRef } from "react";
import {
  VerificationBundle,
  SimplifiedVerificationBundle,
  VerifyOutput,
} from "@/lib/types";
import { verifyBundle, parseBundle, generateAuditReport } from "@/lib/verifier";

export default function VerifyPage() {
  const [bundle, setBundle] = useState<
    VerificationBundle | SimplifiedVerificationBundle | null
  >(null);
  const [result, setResult] = useState<VerifyOutput | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileRead = useCallback(async (content: string, name: string) => {
    setError(null);
    setResult(null);
    setFileName(name);

    try {
      const parsedBundle = parseBundle(content);
      setBundle(parsedBundle);
      setIsVerifying(true);

      const verificationResult = await verifyBundle(parsedBundle);
      setResult(verificationResult);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to parse verification bundle"
      );
      setBundle(null);
    } finally {
      setIsVerifying(false);
    }
  }, []);

  const handleFileUpload = useCallback(
    (file: File) => {
      if (!file.name.endsWith(".json")) {
        setError("Please upload a JSON file");
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        handleFileRead(content, file.name);
      };
      reader.onerror = () => {
        setError("Failed to read file");
      };
      reader.readAsText(file);
    },
    [handleFileRead]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);

      const file = e.dataTransfer.files[0];
      if (file) {
        handleFileUpload(file);
      }
    },
    [handleFileUpload]
  );

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleFileUpload(file);
      }
    },
    [handleFileUpload]
  );

  const handleLoadExample = useCallback(async () => {
    setError(null);
    setResult(null);
    setFileName("sample-spin.json");

    try {
      const response = await fetch("/sample-spin.json");
      if (!response.ok) {
        throw new Error("Failed to load example file");
      }
      const content = await response.text();
      const parsedBundle = parseBundle(content);
      setBundle(parsedBundle);
      setIsVerifying(true);

      const verificationResult = await verifyBundle(parsedBundle);
      setResult(verificationResult);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load example"
      );
      setBundle(null);
    } finally {
      setIsVerifying(false);
    }
  }, []);

  const handleCopyReport = useCallback(() => {
    if (bundle && result) {
      const report = generateAuditReport(bundle, result);
      navigator.clipboard.writeText(report);
    }
  }, [bundle, result]);

  const handleReset = useCallback(() => {
    setBundle(null);
    setResult(null);
    setError(null);
    setFileName(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);

  const isN6Bundle = (
    b: VerificationBundle | SimplifiedVerificationBundle
  ): b is VerificationBundle => {
    return "version" in b && "game" in b && "seeds" in b;
  };

  return (
    <div className="section-container py-12">
      <div className="max-w-4xl mx-auto">
        <h1 className="h2-section text-center mb-4">Verify Spin Results</h1>
        <p className="body-large text-center mb-8">
          Upload a verification bundle to independently verify the fairness of any spin.
          All verification is performed client-side using cryptographic proofs.
        </p>

        {/* File Upload Area */}
        <div
          className={`border-2 border-dashed rounded-xl p-8 mb-8 transition-colors duration-200 ${
            isDragging
              ? "border-secondary bg-secondary/10"
              : "border-text-secondary/30 hover:border-secondary/50"
          }`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <div className="text-center">
            <svg
              className="w-12 h-12 mx-auto mb-4 text-text-secondary"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
            <p className="body-regular mb-4">
              Drag and drop your verification bundle here, or
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <label className="btn-primary cursor-pointer">
                <span>Browse Files</span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleInputChange}
                  className="sr-only"
                  aria-label="Upload verification bundle JSON file"
                />
              </label>
              <button
                onClick={handleLoadExample}
                className="btn-secondary"
                type="button"
              >
                Load Example
              </button>
            </div>
            {fileName && (
              <p className="mt-4 text-text-secondary text-sm">
                Loaded: {fileName}
              </p>
            )}
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div
            className="bg-red-900/30 border border-red-500 rounded-lg p-4 mb-8"
            role="alert"
          >
            <div className="flex items-start gap-3">
              <svg
                className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0"
                fill="currentColor"
                viewBox="0 0 20 20"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
              <div>
                <h3 className="font-semibold text-red-400">Error</h3>
                <p className="text-red-300 text-sm">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Loading State */}
        {isVerifying && (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-secondary border-t-transparent mb-4" />
            <p className="body-regular">Verifying spin data...</p>
          </div>
        )}

        {/* Results Display */}
        {result && !isVerifying && (
          <div className="space-y-6">
            {/* Overall Result Banner */}
            <div
              className={`rounded-xl p-6 ${
                result.ok
                  ? "bg-green-900/30 border border-green-500"
                  : "bg-red-900/30 border border-red-500"
              }`}
              role="status"
              aria-live="polite"
            >
              <div className="flex items-center gap-4">
                {result.ok ? (
                  <svg
                    className="w-10 h-10 text-green-500 flex-shrink-0"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                    aria-hidden="true"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                ) : (
                  <svg
                    className="w-10 h-10 text-red-500 flex-shrink-0"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                    aria-hidden="true"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
                <div>
                  <h2
                    className={`text-2xl font-bold ${
                      result.ok ? "text-green-400" : "text-red-400"
                    }`}
                  >
                    {result.ok ? "Verification Successful" : "Verification Failed"}
                  </h2>
                  <p className="text-text-secondary">{result.summary}</p>
                </div>
              </div>
            </div>

            {/* Verification Breakdown */}
            <div className="bg-secondary-bg rounded-xl p-6">
              <h3 className="h3-card mb-6">Verification Breakdown</h3>

              <div className="space-y-4">
                {/* Commitment Check */}
                <div className="flex items-start gap-3 p-4 bg-primary-bg rounded-lg">
                  <div className="flex-shrink-0 mt-0.5">
                    {result.checks.commitment.ok ? (
                      <span className="text-green-500 text-xl" aria-label="Passed">&#10003;</span>
                    ) : (
                      <span className="text-red-500 text-xl" aria-label="Failed">&#10007;</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-text-primary">
                      Commitment Verification
                    </h4>
                    <p className="text-sm text-text-secondary">
                      {result.checks.commitment.details}
                    </p>
                    {result.checks.commitment.computed && (
                      <p className="text-xs text-text-secondary/70 mt-1 font-mono break-all">
                        Computed: {result.checks.commitment.computed}
                      </p>
                    )}
                  </div>
                </div>

                {/* Mixing Check */}
                <div className="flex items-start gap-3 p-4 bg-primary-bg rounded-lg">
                  <div className="flex-shrink-0 mt-0.5">
                    {result.checks.mixing.ok ? (
                      <span className="text-green-500 text-xl" aria-label="Passed">&#10003;</span>
                    ) : (
                      <span className="text-red-500 text-xl" aria-label="Failed">&#10007;</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-text-primary">
                      Seed Mixing (HKDF)
                    </h4>
                    <p className="text-sm text-text-secondary">
                      {result.checks.mixing.details}
                    </p>
                    {result.checks.mixing.computed && (
                      <p className="text-xs text-text-secondary/70 mt-1 font-mono break-all">
                        Computed: {result.checks.mixing.computed}
                      </p>
                    )}
                  </div>
                </div>

                {/* Result Check */}
                <div className="flex items-start gap-3 p-4 bg-primary-bg rounded-lg">
                  <div className="flex-shrink-0 mt-0.5">
                    {result.checks.result.ok ? (
                      <span className="text-green-500 text-xl" aria-label="Passed">&#10003;</span>
                    ) : (
                      <span className="text-red-500 text-xl" aria-label="Failed">&#10007;</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-text-primary">
                      Outcome Verification
                    </h4>
                    <p className="text-sm text-text-secondary">
                      {result.checks.result.details}
                    </p>
                    {result.checks.result.computedStops.length > 0 && (
                      <p className="text-xs text-text-secondary/70 mt-1 font-mono">
                        Computed Stops: [{result.checks.result.computedStops.join(", ")}]
                      </p>
                    )}
                  </div>
                </div>

                {/* Hash Chain Check (if present) */}
                {result.checks.hashChain && (
                  <div className="flex items-start gap-3 p-4 bg-primary-bg rounded-lg">
                    <div className="flex-shrink-0 mt-0.5">
                      {result.checks.hashChain.ok ? (
                        <span className="text-green-500 text-xl" aria-label="Passed">&#10003;</span>
                      ) : (
                        <span className="text-red-500 text-xl" aria-label="Failed">&#10007;</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-text-primary">
                        Hash Chain Integrity
                      </h4>
                      <p className="text-sm text-text-secondary">
                        {result.checks.hashChain.details}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Warnings */}
              {result.warnings.length > 0 && (
                <div className="mt-6 p-4 bg-yellow-900/20 border border-yellow-600/30 rounded-lg">
                  <h4 className="font-semibold text-yellow-400 mb-2">Warnings</h4>
                  <ul className="list-disc list-inside text-sm text-yellow-300/80">
                    {result.warnings.map((warning, i) => (
                      <li key={i}>{warning}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Bundle Details */}
            {bundle && (
              <div className="bg-secondary-bg rounded-xl p-6">
                <h3 className="h3-card mb-4">Bundle Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  {isN6Bundle(bundle) ? (
                    <>
                      <div>
                        <span className="text-text-secondary">Spin ID:</span>{" "}
                        <span className="font-mono">{bundle.spin.spinId}</span>
                      </div>
                      <div>
                        <span className="text-text-secondary">Game:</span>{" "}
                        <span className="font-mono">{bundle.game.id}</span>
                      </div>
                      <div>
                        <span className="text-text-secondary">Timestamp:</span>{" "}
                        <span className="font-mono">{bundle.spin.timestamp}</span>
                      </div>
                      <div>
                        <span className="text-text-secondary">Mode:</span>{" "}
                        <span className="font-mono">{bundle.spin.mode}</span>
                      </div>
                      <div className="md:col-span-2">
                        <span className="text-text-secondary">Symbols:</span>{" "}
                        <span className="font-mono">
                          [{bundle.result.symbols.join(", ")}]
                        </span>
                      </div>
                      <div>
                        <span className="text-text-secondary">Bet:</span>{" "}
                        <span className="font-mono">
                          {bundle.result.payout.bet} {bundle.result.payout.currency}
                        </span>
                      </div>
                      <div>
                        <span className="text-text-secondary">Win:</span>{" "}
                        <span className="font-mono">
                          {bundle.result.payout.win} {bundle.result.payout.currency}
                        </span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <span className="text-text-secondary">Spin ID:</span>{" "}
                        <span className="font-mono">{bundle.spinId}</span>
                      </div>
                      <div>
                        <span className="text-text-secondary">Timestamp:</span>{" "}
                        <span className="font-mono">{bundle.timestamp}</span>
                      </div>
                      <div className="md:col-span-2">
                        <span className="text-text-secondary">Symbols:</span>{" "}
                        <span className="font-mono">
                          [{bundle.outcome.symbols.join(", ")}]
                        </span>
                      </div>
                      <div>
                        <span className="text-text-secondary">Win Amount:</span>{" "}
                        <span className="font-mono">{bundle.outcome.winAmount}</span>
                      </div>
                      {bundle.thetaValues && bundle.thetaValues.length > 0 && (
                        <div className="md:col-span-2">
                          <span className="text-text-secondary">Theta Values (first 3):</span>{" "}
                          <span className="font-mono">
                            [{bundle.thetaValues.slice(0, 3).join(", ")}
                            {bundle.thetaValues.length > 3 ? ", ..." : ""}]
                          </span>
                        </div>
                      )}
                      {bundle.initialConditions && (
                        <div className="md:col-span-2">
                          <span className="text-text-secondary">Initial Masses:</span>{" "}
                          <span className="font-mono">
                            [{bundle.initialConditions.masses.join(", ")}]
                          </span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={handleCopyReport}
                className="btn-secondary"
                type="button"
              >
                Copy Audit Report
              </button>
              <button
                onClick={handleReset}
                className="btn-secondary"
                type="button"
              >
                Verify Another Spin
              </button>
            </div>
          </div>
        )}

        {/* How It Works Section */}
        {!result && !isVerifying && (
          <div className="bg-secondary-bg rounded-xl p-6 mt-8">
            <h3 className="h3-card mb-4">How Verification Works</h3>
            <div className="space-y-4 body-regular">
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-secondary/20 flex items-center justify-center text-secondary font-bold">
                  1
                </div>
                <div>
                  <h4 className="font-semibold text-text-primary">Commitment Check</h4>
                  <p className="text-text-secondary text-sm">
                    We verify that the server seed hashes to the commitment that was
                    published before you played.
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-secondary/20 flex items-center justify-center text-secondary font-bold">
                  2
                </div>
                <div>
                  <h4 className="font-semibold text-text-primary">Seed Mixing</h4>
                  <p className="text-text-secondary text-sm">
                    We verify that the combined seed was correctly derived from the
                    server seed, your client seed, and the nonce using HKDF.
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-secondary/20 flex items-center justify-center text-secondary font-bold">
                  3
                </div>
                <div>
                  <h4 className="font-semibold text-text-primary">Result Derivation</h4>
                  <p className="text-text-secondary text-sm">
                    We verify that the reel positions were deterministically derived
                    from the combined seed using the documented algorithm.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

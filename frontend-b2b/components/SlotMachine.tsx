"use client";

import { useState, useEffect, useCallback } from "react";
import ThreeBodyVisualization from "./ThreeBodyVisualization";
import {
  generateClientSeed,
  generateSessionId,
  getCommitment,
  revealSpin,
  verifySpin,
  CommitmentResponse,
  SpinResult,
  VerificationResponse,
} from "@/lib/api";

interface SlotMachineProps {
  gameId: string;
  gameName: string;
  initialBalance?: number;
}

const SYMBOL_EMOJIS: Record<string, string> = {
  fire: "🔥",
  water: "💧",
  earth: "🌍",
  air: "💨",
  lightning: "⚡",
  ice: "❄️",
  nature: "🌿",
  dark: "🌑",
  light: "☀️",
  dragon: "🐉",
  tiger: "🐅",
  crane: "🦢",
  snake: "🐍",
  monkey: "🐵",
  master: "👨‍🦳",
  scroll: "📜",
  temple: "🏯",
  sword: "⚔️",
  ruby: "🔴",
  emerald: "🟢",
  sapphire: "🔵",
  diamond: "💎",
  amethyst: "🟣",
  topaz: "🟡",
  jade: "🟩",
  pearl: "⚪",
  gold: "🥇",
  cherry: "🍒",
  lemon: "🍋",
  orange: "🍊",
  plum: "🍇",
  bell: "🔔",
  bar: "📊",
  seven: "7️⃣",
  star: "⭐",
  wild: "🃏",
};

const BET_OPTIONS = [1, 5, 10, 25, 50, 100];

export default function SlotMachine({
  gameId,
  gameName,
  initialBalance = 1000,
}: SlotMachineProps) {
  const [balance, setBalance] = useState(initialBalance);
  const [bet, setBet] = useState(10);
  const [isSpinning, setIsSpinning] = useState(false);
  const [reels, setReels] = useState<string[]>(["?", "?", "?", "?", "?"]);
  const [spinningReels, setSpinningReels] = useState<boolean[]>([false, false, false, false, false]);
  const [lastResult, setLastResult] = useState<SpinResult | null>(null);
  const [commitment, setCommitment] = useState<CommitmentResponse | null>(null);
  const [verification, setVerification] = useState<VerificationResponse | null>(null);
  const [showVerification, setShowVerification] = useState(false);
  const [message, setMessage] = useState<string>("");
  const [messageType, setMessageType] = useState<"win" | "lose" | "info">("info");
  const [sessionId, setSessionId] = useState<string>("");

  useEffect(() => {
    setSessionId(generateSessionId());
  }, []);

  const spin = useCallback(async () => {
    if (isSpinning || balance < bet) return;

    setIsSpinning(true);
    setMessage("");
    setVerification(null);
    setShowVerification(false);

    setSpinningReels([true, true, true, true, true]);

    try {
      const newCommitment = await getCommitment(sessionId);
      setCommitment(newCommitment);

      const clientSeed = generateClientSeed();

      const result = await revealSpin({
        sessionId,
        clientSeed,
        bet,
        gameId,
      });

      const stopDelays = [800, 1000, 1200, 1400, 1600];
      for (let i = 0; i < 5; i++) {
        await new Promise((resolve) => setTimeout(resolve, stopDelays[i] - (i > 0 ? stopDelays[i - 1] : 0)));
        setSpinningReels((prev) => {
          const next = [...prev];
          next[i] = false;
          return next;
        });
        setReels((prev) => {
          const next = [...prev];
          next[i] = result.symbols[i];
          return next;
        });
      }

      setLastResult(result);

      if (result.isWin) {
        setBalance((prev) => prev - bet + result.winAmount);
        setMessage(`WIN! ${result.multiplier}x - +${result.winAmount} credits!`);
        setMessageType("win");
      } else {
        setBalance((prev) => prev - bet);
        setMessage("No win this time. Try again!");
        setMessageType("lose");
      }

      const verifyResult = await verifySpin({
        spinId: result.spinId,
        serverSeed: result.serverSeed,
        clientSeed: result.clientSeed,
        nonce: result.nonce,
        commitmentHash: result.commitmentHash,
        combinedSeedHex: result.combinedSeedHex,
        reelStops: result.reelStops,
      });
      setVerification(verifyResult);
    } catch (error) {
      console.error("Spin error:", error);
      setMessage("Error during spin. Please try again.");
      setMessageType("info");
    } finally {
      setIsSpinning(false);
    }
  }, [isSpinning, balance, bet, sessionId, gameId]);

  const getSymbolDisplay = (symbol: string, isSpinning: boolean) => {
    if (isSpinning) {
      const randomSymbols = Object.values(SYMBOL_EMOJIS);
      return randomSymbols[Math.floor(Math.random() * randomSymbols.length)];
    }
    return SYMBOL_EMOJIS[symbol] || symbol;
  };

  const resetGame = () => {
    setBalance(initialBalance);
    setReels(["?", "?", "?", "?", "?"]);
    setLastResult(null);
    setCommitment(null);
    setVerification(null);
    setShowVerification(false);
    setMessage("");
    setSessionId(generateSessionId());
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-secondary-bg rounded-2xl p-6 md:p-8 border border-primary/20">
        <div className="text-center mb-6">
          <h2 className="h3-card text-2xl md:text-3xl mb-2">{gameName}</h2>
          <p className="text-text-secondary text-sm">Demo Mode - Provably Fair</p>
        </div>

        <div className="flex flex-col lg:flex-row gap-6 items-center justify-center mb-6">
          <div className="flex-shrink-0">
            <ThreeBodyVisualization isAnimating={isSpinning} size={180} />
          </div>

          <div className="flex-1 w-full">
            <div className="bg-primary-bg rounded-xl p-4 md:p-6 border border-primary/30">
              <div className="flex justify-center gap-2 md:gap-3 mb-4">
                {reels.map((symbol, index) => (
                  <div
                    key={index}
                    className={`
                      w-14 h-20 md:w-20 md:h-28 
                      bg-gradient-to-b from-secondary-bg to-primary-bg 
                      rounded-lg border-2 border-primary/40
                      flex items-center justify-center
                      text-3xl md:text-5xl
                      transition-all duration-200
                      ${spinningReels[index] ? "animate-pulse border-secondary" : ""}
                      ${lastResult?.isWin && !isSpinning ? "border-green-500 shadow-[0_0_15px_rgba(34,197,94,0.5)]" : ""}
                    `}
                  >
                    <span className={spinningReels[index] ? "animate-bounce" : ""}>
                      {spinningReels[index] ? (
                        <SpinningReel />
                      ) : (
                        getSymbolDisplay(symbol, false)
                      )}
                    </span>
                  </div>
                ))}
              </div>

              {message && (
                <div
                  className={`
                    text-center py-3 px-4 rounded-lg mb-4 font-bold text-lg
                    ${messageType === "win" ? "bg-green-900/50 text-green-400 animate-pulse" : ""}
                    ${messageType === "lose" ? "bg-red-900/30 text-red-400" : ""}
                    ${messageType === "info" ? "bg-blue-900/30 text-blue-400" : ""}
                  `}
                >
                  {message}
                </div>
              )}

              <div className="flex flex-wrap justify-center gap-4 items-center">
                <div className="flex items-center gap-2">
                  <span className="text-text-secondary text-sm">Balance:</span>
                  <span className="text-xl font-bold text-secondary">{balance}</span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-text-secondary text-sm">Bet:</span>
                  <select
                    value={bet}
                    onChange={(e) => setBet(Number(e.target.value))}
                    disabled={isSpinning}
                    className="bg-primary-bg border border-primary/40 rounded px-3 py-1 text-text-primary"
                  >
                    {BET_OPTIONS.map((option) => (
                      <option key={option} value={option} disabled={option > balance}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap justify-center gap-4 mb-6">
          <button
            onClick={spin}
            disabled={isSpinning || balance < bet}
            className={`
              btn-primary text-xl px-12 py-4
              ${isSpinning || balance < bet ? "opacity-50 cursor-not-allowed" : ""}
            `}
          >
            {isSpinning ? "SPINNING..." : "SPIN"}
          </button>

          <button
            onClick={resetGame}
            disabled={isSpinning}
            className="btn-secondary"
          >
            Reset Demo
          </button>
        </div>

        {commitment && (
          <div className="bg-primary-bg rounded-xl p-4 border border-primary/20 mb-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-text-primary">Provably Fair Data</h3>
              <button
                onClick={() => setShowVerification(!showVerification)}
                className="text-secondary text-sm hover:underline"
              >
                {showVerification ? "Hide Details" : "Show Details"}
              </button>
            </div>

            <div className="flex items-center gap-2 mb-2">
              <span className="text-text-secondary text-sm">Status:</span>
              {verification ? (
                verification.valid ? (
                  <span className="text-green-500 font-semibold flex items-center gap-1">
                    <span className="text-lg">&#10003;</span> Verified Fair
                  </span>
                ) : (
                  <span className="text-red-500 font-semibold flex items-center gap-1">
                    <span className="text-lg">&#10007;</span> Verification Failed
                  </span>
                )
              ) : (
                <span className="text-text-secondary">Pending...</span>
              )}
            </div>

            {showVerification && (
              <div className="mt-4 space-y-3 text-sm">
                <div>
                  <span className="text-text-secondary">Commitment Hash:</span>
                  <p className="font-mono text-xs break-all text-text-primary/80 bg-secondary-bg p-2 rounded mt-1">
                    {commitment.commitmentHash}
                  </p>
                </div>

                {lastResult && (
                  <>
                    <div>
                      <span className="text-text-secondary">Server Seed:</span>
                      <p className="font-mono text-xs break-all text-text-primary/80 bg-secondary-bg p-2 rounded mt-1">
                        {lastResult.serverSeed}
                      </p>
                    </div>

                    <div>
                      <span className="text-text-secondary">Client Seed:</span>
                      <p className="font-mono text-xs break-all text-text-primary/80 bg-secondary-bg p-2 rounded mt-1">
                        {lastResult.clientSeed}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-text-secondary">Nonce:</span>
                        <p className="font-mono text-text-primary/80">{lastResult.nonce}</p>
                      </div>
                      <div>
                        <span className="text-text-secondary">Spin ID:</span>
                        <p className="font-mono text-xs text-text-primary/80 truncate">{lastResult.spinId}</p>
                      </div>
                    </div>

                    <div>
                      <span className="text-text-secondary">Combined Seed (HKDF):</span>
                      <p className="font-mono text-xs break-all text-text-primary/80 bg-secondary-bg p-2 rounded mt-1">
                        {lastResult.combinedSeedHex}
                      </p>
                    </div>

                    <div>
                      <span className="text-text-secondary">Reel Stops:</span>
                      <p className="font-mono text-text-primary/80">
                        [{lastResult.reelStops.join(", ")}]
                      </p>
                    </div>
                  </>
                )}

                {verification && (
                  <div className="border-t border-primary/20 pt-3 mt-3">
                    <h4 className="font-semibold text-text-primary mb-2">Verification Checks</h4>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        {verification.checks.commitment ? (
                          <span className="text-green-500">&#10003;</span>
                        ) : (
                          <span className="text-red-500">&#10007;</span>
                        )}
                        <span className="text-text-secondary">Commitment (SHA-256)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {verification.checks.mixing ? (
                          <span className="text-green-500">&#10003;</span>
                        ) : (
                          <span className="text-red-500">&#10007;</span>
                        )}
                        <span className="text-text-secondary">Seed Mixing (HKDF)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {verification.checks.result ? (
                          <span className="text-green-500">&#10003;</span>
                        ) : (
                          <span className="text-red-500">&#10007;</span>
                        )}
                        <span className="text-text-secondary">Result Derivation</span>
                      </div>
                    </div>
                    <p className="text-xs text-text-secondary mt-2">{verification.details}</p>
                  </div>
                )}

                <div className="text-center pt-2">
                  <a
                    href="/verify"
                    className="text-secondary hover:underline text-sm"
                  >
                    Full Verification Tool →
                  </a>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="text-center text-xs text-text-secondary">
          <p>This is a demo game. No real money is involved.</p>
          <p className="mt-1">
            Every spin is cryptographically verified using the Three-Body Entropy RNG system.
          </p>
        </div>
      </div>
    </div>
  );
}

function SpinningReel() {
  const [symbol, setSymbol] = useState("🎰");
  
  useEffect(() => {
    const symbols = Object.values(SYMBOL_EMOJIS);
    const interval = setInterval(() => {
      setSymbol(symbols[Math.floor(Math.random() * symbols.length)]);
    }, 80);
    
    return () => clearInterval(interval);
  }, []);
  
  return <span>{symbol}</span>;
}

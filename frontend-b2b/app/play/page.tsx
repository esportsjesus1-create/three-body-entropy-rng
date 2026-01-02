"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import SlotMachine from "@/components/SlotMachine";
import { games } from "@/data/games";
import Link from "next/link";

function PlayPageContent() {
  const searchParams = useSearchParams();
  const gameIdParam = searchParams.get("game");
  
  const [selectedGame, setSelectedGame] = useState<string | null>(null);

  useEffect(() => {
    if (gameIdParam) {
      setSelectedGame(gameIdParam);
    }
  }, [gameIdParam]);

  const currentGame = games.find((g) => g.id === selectedGame);

  if (!selectedGame || !currentGame) {
    return (
      <div className="section-container py-12">
        <div className="text-center mb-12">
          <h1 className="h2-section mb-4">Play Demo</h1>
          <p className="body-large max-w-2xl mx-auto">
            Experience our provably fair slot games. Every spin is cryptographically
            verified using the Three-Body Entropy RNG system.
          </p>
        </div>

        <div className="grid-3-col max-w-5xl mx-auto">
          {games.map((game) => (
            <button
              key={game.id}
              onClick={() => setSelectedGame(game.id)}
              className="group bg-secondary-bg rounded-xl p-6 border border-primary/20 
                         hover:border-primary/60 transition-all duration-300 
                         hover:shadow-[0_0_30px_rgba(250,22,37,0.3)] hover:-translate-y-2
                         text-left"
            >
              <div className="aspect-video bg-primary-bg rounded-lg mb-4 flex items-center justify-center overflow-hidden">
                <div className="text-6xl">
                  {game.id === "elemental-legends" && "🔥💧🌍"}
                  {game.id === "kungfu-world" && "🐉🥋⚔️"}
                  {game.id === "kungfu-gem" && "💎🟢🔴"}
                </div>
              </div>
              <h3 className="h3-card mb-2">{game.title}</h3>
              <p className="body-regular text-sm mb-4">{game.description}</p>
              <div className="flex flex-wrap gap-2 text-xs text-text-secondary">
                <span className="bg-primary-bg px-2 py-1 rounded">RTP {game.rtp}</span>
                <span className="bg-primary-bg px-2 py-1 rounded">{game.reels} Reels</span>
                <span className="bg-primary-bg px-2 py-1 rounded">{game.paylines} Paylines</span>
              </div>
              <div className="mt-4 text-center">
                <span className="btn-primary inline-block group-hover:scale-105 transition-transform">
                  PLAY NOW
                </span>
              </div>
            </button>
          ))}
        </div>

        <div className="text-center mt-12">
          <Link href="/" className="text-secondary hover:underline">
            ← Back to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="section-container py-8">
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => setSelectedGame(null)}
          className="text-secondary hover:underline flex items-center gap-2"
        >
          <span>←</span>
          <span>Choose Another Game</span>
        </button>
        <Link href="/" className="text-text-secondary hover:text-text-primary">
          Back to Home
        </Link>
      </div>

      <SlotMachine
        gameId={currentGame.id}
        gameName={currentGame.title}
        initialBalance={1000}
      />

      <div className="mt-8 max-w-4xl mx-auto">
        <div className="bg-secondary-bg rounded-xl p-6 border border-primary/20">
          <h3 className="h3-card mb-4">How It Works</h3>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl">1</span>
              </div>
              <h4 className="font-semibold text-text-primary mb-2">Commit</h4>
              <p className="text-sm text-text-secondary">
                Before each spin, the server commits to a random seed by publishing its hash.
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-secondary/20 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl">2</span>
              </div>
              <h4 className="font-semibold text-text-primary mb-2">Mix</h4>
              <p className="text-sm text-text-secondary">
                Your client seed is combined with the server seed using HKDF to create the final entropy.
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-accent/20 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl">3</span>
              </div>
              <h4 className="font-semibold text-text-primary mb-2">Verify</h4>
              <p className="text-sm text-text-secondary">
                After the spin, you can verify that the result was fairly derived from the seeds.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className="section-container py-12">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-secondary border-t-transparent mb-4" />
        <p className="body-regular">Loading game...</p>
      </div>
    </div>
  );
}

export default function PlayPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <PlayPageContent />
    </Suspense>
  );
}

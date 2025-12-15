"use client";

import GameCard from "./GameCard";
import { games } from "@/data/games";

export default function GamePortfolio() {
  return (
    <section
      className="py-16 md:py-24 bg-primary-bg"
      aria-labelledby="games-section-title"
    >
      <div className="section-container">
        <h2
          id="games-section-title"
          className="h2-section text-center mb-12"
        >
          Our Games
        </h2>

        <div className="grid-3-col" role="list" aria-label="Game portfolio">
          {games.map((game) => (
            <div key={game.id} role="listitem">
              <GameCard
                title={game.title}
                imageUrl={game.imageUrl}
                description={game.description}
                rtp={game.rtp}
                reels={game.reels}
                paylines={game.paylines}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

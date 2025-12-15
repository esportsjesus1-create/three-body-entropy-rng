'use client';

import GameLogo from './GameLogo';

const games = [
  { name: 'Elemental Legends', imageSrc: undefined },
  { name: 'KungFuWorld', imageSrc: undefined },
  { name: 'KungFuGem', imageSrc: undefined },
];

export default function HeroSection() {
  return (
    <section className="relative min-h-[80vh] w-full bg-gradient-to-b from-primary-bg to-secondary-bg flex items-center justify-center overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent" />
      
      <div className="relative z-10 section-container py-16 md:py-24 flex flex-col items-center text-center">
        <h1 className="ht-display mb-6">
          PROVABLY FAIR SLOTS
        </h1>
        
        <p className="body-large text-xl md:text-2xl mb-12 max-w-2xl">
          Every Spin. Cryptographically Verified.
        </p>
        
        <div className="grid-3-col w-full max-w-4xl mb-12">
          {games.map((game) => (
            <GameLogo key={game.name} name={game.name} imageSrc={game.imageSrc} />
          ))}
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 items-center">
          <button className="btn-primary">
            PLAY DEMO
          </button>
          <button className="btn-secondary">
            Verify a Spin
          </button>
        </div>
      </div>
      
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-secondary-bg to-transparent" />
    </section>
  );
}

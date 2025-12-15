"use client";

import Image from "next/image";

export interface GameCardProps {
  title: string;
  imageUrl: string;
  description?: string;
  rtp?: string;
  reels?: number;
  paylines?: number;
}

export default function GameCard({
  title,
  imageUrl,
  description,
  rtp,
  reels,
  paylines,
}: GameCardProps) {
  return (
    <article
      className="group relative bg-secondary-bg rounded-xl overflow-hidden border border-primary/20 
                 hover:border-primary/60 transition-all duration-300 
                 hover:shadow-[0_0_30px_rgba(250,22,37,0.3)] hover:-translate-y-2"
      role="article"
      aria-label={`${title} game card`}
    >
      <div className="relative aspect-[4/3] overflow-hidden">
        <Image
          src={imageUrl}
          alt={`${title} slot game preview`}
          fill
          className="object-cover transition-transform duration-300 group-hover:scale-105"
          sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-primary-bg/90 via-transparent to-transparent" />
        
        <span
          className="absolute top-4 right-4 bg-secondary/90 text-primary-bg text-xs font-bold 
                     px-3 py-1 rounded-full uppercase tracking-wide"
          aria-label="Provably fair badge"
        >
          Provably Fair
        </span>
      </div>

      <div className="p-6">
        <h3 className="h3-card mb-2">{title}</h3>
        
        {description && (
          <p className="body-regular mb-4 line-clamp-2">{description}</p>
        )}

        {(rtp || reels || paylines) && (
          <div 
            className="flex flex-wrap gap-3 mb-4 text-sm text-text-secondary"
            aria-label="Game statistics"
          >
            {rtp && (
              <span className="bg-primary-bg px-3 py-1 rounded-full">
                RTP {rtp}
              </span>
            )}
            {reels && (
              <span className="bg-primary-bg px-3 py-1 rounded-full">
                {reels} Reels
              </span>
            )}
            {paylines && (
              <span className="bg-primary-bg px-3 py-1 rounded-full">
                {paylines} Paylines
              </span>
            )}
          </div>
        )}

        <button
          className="btn-primary w-full text-center"
          aria-label={`Play demo of ${title}`}
        >
          PLAY DEMO
        </button>
      </div>
    </article>
  );
}

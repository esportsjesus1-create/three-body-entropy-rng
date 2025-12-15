'use client';

import Image from 'next/image';

interface GameLogoProps {
  name: string;
  imageSrc?: string;
}

export default function GameLogo({ name, imageSrc }: GameLogoProps) {
  return (
    <div className="flex flex-col items-center justify-center p-4 group">
      <div className="relative w-24 h-24 md:w-32 md:h-32 lg:w-40 lg:h-40 rounded-xl overflow-hidden bg-gradient-to-br from-primary-bg to-secondary-bg border border-secondary/30 shadow-lg group-hover:shadow-secondary/20 group-hover:scale-105 transition-all duration-300">
        {imageSrc ? (
          <Image
            src={imageSrc}
            alt={`${name} logo`}
            fill
            className="object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-secondary/20">
            <span className="text-2xl md:text-3xl lg:text-4xl font-bold text-secondary">
              {name.charAt(0)}
            </span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      </div>
      <span className="mt-3 text-sm md:text-base font-medium text-text-secondary group-hover:text-secondary transition-colors duration-300 text-center">
        {name}
      </span>
    </div>
  );
}

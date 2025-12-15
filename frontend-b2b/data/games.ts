export interface Game {
  id: string;
  title: string;
  imageUrl: string;
  description: string;
  rtp: string;
  reels: number;
  paylines: number;
}

export const games: Game[] = [
  {
    id: "elemental-legends",
    title: "Elemental Legends",
    imageUrl: "/images/elemental-legends.svg",
    description: "Mystical floating islands with elemental powers",
    rtp: "96.5%",
    reels: 5,
    paylines: 25,
  },
  {
    id: "kungfu-world",
    title: "KungFuWorld",
    imageUrl: "/images/kungfu-world.svg",
    description: "Martial arts mastery meets mystical Chinese mythology",
    rtp: "96.2%",
    reels: 5,
    paylines: 20,
  },
  {
    id: "kungfu-gem",
    title: "KungFuGem",
    imageUrl: "/images/kungfu-gem.svg",
    description: "Crystal-powered kung fu adventure",
    rtp: "96.8%",
    reels: 5,
    paylines: 30,
  },
];

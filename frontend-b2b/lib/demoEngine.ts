export interface SpinResult {
  spinId: string;
  timestamp: string;
  reels: ReelResult[];
  symbols: string[];
  winAmount: number;
  betAmount: number;
}

export interface ReelResult {
  reelIndex: number;
  sessionId: string;
  commitment: string;
  houseSeed: string;
  clientSeed: string;
  entropyHex: string;
  position: number;
  symbol: string;
}

const SYMBOLS = [
  { id: "fa", name: "Green Dragon", emoji: "🀅" },
  { id: "zhong", name: "Red Dragon", emoji: "🀄" },
  { id: "bai", name: "White Dragon", emoji: "🀆" },
  { id: "bawan", name: "80,000", emoji: "🎰" },
  { id: "wusuo", name: "5 Bamboo", emoji: "🎋" },
  { id: "wutong", name: "5 Circles", emoji: "⭕" },
  { id: "liangsuo", name: "2 Bamboo", emoji: "🎍" },
  { id: "liangtong", name: "2 Circles", emoji: "🔵" },
  { id: "wild", name: "Wild", emoji: "⭐" },
  { id: "bonus", name: "Bonus", emoji: "💎" },
];

export const SYMBOL_LIST = SYMBOLS;

function generateUUID(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function generateHexString(length: number): string {
  const array = new Uint8Array(length / 2);
  if (typeof window !== "undefined") {
    window.crypto.getRandomValues(array);
  } else {
    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
  }
  return Array.from(array)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function sha256(message: string): Promise<string> {
  if (typeof window !== "undefined" && window.crypto?.subtle) {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await window.crypto.subtle.digest("SHA-256", msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  }
  return generateHexString(64);
}

export async function generateDemoSpin(
  clientSeed: string,
  nonce: number,
  betAmount: number
): Promise<SpinResult> {
  const REEL_COUNT = 5;
  const reels: ReelResult[] = [];

  for (let i = 0; i < REEL_COUNT; i++) {
    const houseSeed = generateHexString(64);
    const commitment = await sha256(houseSeed);
    const reelClientSeed = `${clientSeed}:${nonce}:${i}`;
    const entropyHex = await sha256(`${houseSeed}:${reelClientSeed}`);

    const entropyNum = parseInt(entropyHex.substring(0, 8), 16);
    const position = entropyNum % SYMBOLS.length;

    reels.push({
      reelIndex: i,
      sessionId: generateUUID(),
      commitment,
      houseSeed,
      clientSeed: reelClientSeed,
      entropyHex,
      position,
      symbol: SYMBOLS[position].id,
    });
  }

  const symbols = reels.map((r) => r.symbol);
  const winAmount = calculateWin(symbols, betAmount);

  return {
    spinId: generateUUID(),
    timestamp: new Date().toISOString(),
    reels,
    symbols,
    winAmount,
    betAmount,
  };
}

function calculateWin(symbols: string[], betAmount: number): number {
  const counts: Record<string, number> = {};
  for (const s of symbols) {
    counts[s] = (counts[s] || 0) + 1;
  }

  let multiplier = 0;

  for (const [symbol, count] of Object.entries(counts)) {
    if (count >= 3) {
      if (symbol === "wild") {
        multiplier += count === 5 ? 100 : count === 4 ? 25 : 10;
      } else if (symbol === "bonus") {
        multiplier += count === 5 ? 50 : count === 4 ? 15 : 5;
      } else if (["fa", "zhong", "bai"].includes(symbol)) {
        multiplier += count === 5 ? 20 : count === 4 ? 8 : 3;
      } else {
        multiplier += count === 5 ? 10 : count === 4 ? 4 : 2;
      }
    }
  }

  return betAmount * multiplier;
}

export function getSymbolEmoji(symbolId: string): string {
  const symbol = SYMBOLS.find((s) => s.id === symbolId);
  return symbol?.emoji || "❓";
}

export function getSymbolName(symbolId: string): string {
  const symbol = SYMBOLS.find((s) => s.id === symbolId);
  return symbol?.name || "Unknown";
}

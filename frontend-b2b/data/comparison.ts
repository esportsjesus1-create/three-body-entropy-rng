export interface ComparisonItem {
  id: string;
  feature: string;
  traditional: string;
  provablyFair: string;
  threeBody: string;
  traditionalPass: boolean;
  provablyFairPass: boolean;
  threeBodyPass: boolean;
}

export const comparisonData: ComparisonItem[] = [
  {
    id: "entropy-source",
    feature: "Entropy Source",
    traditional: "Pseudo-random",
    provablyFair: "Hash-based",
    threeBody: "Three-Body Physics",
    traditionalPass: false,
    provablyFairPass: true,
    threeBodyPass: true,
  },
  {
    id: "verification",
    feature: "Verification",
    traditional: "None",
    provablyFair: "Hash-based",
    threeBody: "Cryptographic + Physics",
    traditionalPass: false,
    provablyFairPass: true,
    threeBodyPass: true,
  },
  {
    id: "transparency",
    feature: "Transparency",
    traditional: "Closed",
    provablyFair: "Partial",
    threeBody: "Full",
    traditionalPass: false,
    provablyFairPass: true,
    threeBodyPass: true,
  },
  {
    id: "mathematical-proof",
    feature: "Mathematical Proof",
    traditional: "No",
    provablyFair: "Basic",
    threeBody: "Advanced",
    traditionalPass: false,
    provablyFairPass: true,
    threeBodyPass: true,
  },
];

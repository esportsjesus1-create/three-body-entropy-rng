import Link from "next/link";

export const metadata = {
  title: "Provably Fair Gaming | Three-Body Entropy RNG",
  description: "Learn how three-body physics creates truly unpredictable, verifiable randomness for provably fair gaming.",
};

export default function ProvablyFairPage() {
  return (
    <div className="section-container py-12">
      <div className="max-w-4xl mx-auto">
        <h1 className="h2-section text-center mb-4">
          Why Three-Body RNG is Provably Fair
        </h1>
        <p className="body-large text-center mb-12">
          Understanding how chaos theory and cryptography combine to create
          verifiable randomness that neither the house nor player can manipulate.
        </p>

        <section className="mb-16">
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
            <span className="w-10 h-10 rounded-full bg-purple-600/20 flex items-center justify-center text-purple-400">
              1
            </span>
            The Three-Body Problem
          </h2>
          <div className="bg-secondary-bg rounded-xl p-6 space-y-4">
            <p className="text-text-secondary">
              The three-body problem is one of the oldest unsolved problems in physics. 
              When three celestial bodies interact gravitationally, their motion becomes 
              chaotic and fundamentally unpredictable, even with perfect knowledge of 
              initial conditions.
            </p>
            <p className="text-text-secondary">
              This chaos is not due to measurement error or computational limits. It is 
              an intrinsic property of the system. Tiny differences in starting positions 
              lead to completely different trajectories, a phenomenon known as sensitive 
              dependence on initial conditions.
            </p>
            <div className="bg-primary-bg rounded-lg p-4 border border-purple-500/30">
              <h4 className="font-semibold text-white mb-2">Why This Matters for RNG</h4>
              <p className="text-sm text-text-secondary">
                We simulate three gravitational bodies using the Runge-Kutta 4th order 
                method (RK4). The chaotic dynamics ensure that even the smallest change 
                in seed values produces completely different entropy output. This makes 
                prediction mathematically impossible.
              </p>
            </div>
          </div>
        </section>

        <section className="mb-16">
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
            <span className="w-10 h-10 rounded-full bg-purple-600/20 flex items-center justify-center text-purple-400">
              2
            </span>
            Commit-Reveal Protocol
          </h2>
          <div className="bg-secondary-bg rounded-xl p-6 space-y-4">
            <p className="text-text-secondary">
              The commit-reveal protocol ensures that neither the house nor the player 
              can manipulate the outcome. Here is how it works:
            </p>
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-yellow-600/20 flex items-center justify-center text-yellow-400 font-bold flex-shrink-0">
                  A
                </div>
                <div>
                  <h4 className="font-semibold text-white">Commit Phase</h4>
                  <p className="text-sm text-text-secondary">
                    Before you spin, the server generates a house seed using three-body 
                    physics and publishes its SHA-256 hash (the commitment). This hash 
                    locks in the server&apos;s randomness before knowing your input.
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-green-600/20 flex items-center justify-center text-green-400 font-bold flex-shrink-0">
                  B
                </div>
                <div>
                  <h4 className="font-semibold text-white">Player Input</h4>
                  <p className="text-sm text-text-secondary">
                    You provide your own client seed. This seed is combined with the 
                    house seed to determine the final outcome. Since the house already 
                    committed, they cannot change their seed to influence the result.
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-blue-600/20 flex items-center justify-center text-blue-400 font-bold flex-shrink-0">
                  C
                </div>
                <div>
                  <h4 className="font-semibold text-white">Reveal Phase</h4>
                  <p className="text-sm text-text-secondary">
                    After you submit your seed, the server reveals its original house 
                    seed. You can verify that SHA-256(house seed) matches the commitment, 
                    proving the server did not change its seed after seeing yours.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mb-16">
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
            <span className="w-10 h-10 rounded-full bg-purple-600/20 flex items-center justify-center text-purple-400">
              3
            </span>
            Independent Entropy Per Reel
          </h2>
          <div className="bg-secondary-bg rounded-xl p-6 space-y-4">
            <p className="text-text-secondary">
              For maximum fairness and transparency, each reel in our slot games gets 
              its own independent three-body physics simulation. This means:
            </p>
            <ul className="space-y-2 text-text-secondary">
              <li className="flex items-start gap-2">
                <span className="text-purple-400 mt-1">&#8226;</span>
                <span>5 separate commit-reveal cycles for a 5-reel slot</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-400 mt-1">&#8226;</span>
                <span>Each reel has its own house seed, client seed, and entropy value</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-400 mt-1">&#8226;</span>
                <span>No mathematical relationship between reel outcomes</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-400 mt-1">&#8226;</span>
                <span>Each reel can be independently verified</span>
              </li>
            </ul>
            <div className="bg-primary-bg rounded-lg p-4 border border-blue-500/30">
              <h4 className="font-semibold text-white mb-2">Concurrent API Calls</h4>
              <p className="text-sm text-text-secondary">
                To maintain fast spin times, all 5 commits are made in parallel, followed 
                by all 5 reveals in parallel. This reduces latency from 10 sequential 
                round trips to just 2 parallel batches (approximately 400ms total).
              </p>
            </div>
          </div>
        </section>

        <section className="mb-16">
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
            <span className="w-10 h-10 rounded-full bg-purple-600/20 flex items-center justify-center text-purple-400">
              4
            </span>
            Entropy to Symbol Mapping
          </h2>
          <div className="bg-secondary-bg rounded-xl p-6 space-y-4">
            <p className="text-text-secondary">
              Converting entropy to reel positions uses a simple, transparent formula:
            </p>
            <div className="bg-gray-900 rounded-lg p-4 font-mono text-sm overflow-x-auto">
              <code className="text-green-400">
                {`// For each reel:
entropyHex = "3e23e816..." // 64-char hex from API
entropyBigInt = BigInt("0x" + entropyHex)
reelPosition = Number(entropyBigInt % BigInt(10))
symbol = symbols[reelPosition]`}
              </code>
            </div>
            <p className="text-sm text-text-secondary">
              This simple modulo operation ensures uniform distribution across all 
              possible symbols. No complex algorithms, no hidden logic, just pure 
              mathematics that anyone can verify.
            </p>
          </div>
        </section>

        <section className="mb-16">
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
            <span className="w-10 h-10 rounded-full bg-purple-600/20 flex items-center justify-center text-purple-400">
              5
            </span>
            How to Verify a Spin
          </h2>
          <div className="bg-secondary-bg rounded-xl p-6 space-y-4">
            <p className="text-text-secondary">
              Every spin produces a verification bundle that you can check independently:
            </p>
            <div className="space-y-4">
              <div className="bg-primary-bg rounded-lg p-4">
                <h4 className="font-semibold text-white mb-2">Step 1: Verify Commitment</h4>
                <p className="text-sm text-text-secondary">
                  Compute SHA-256(house seed) and confirm it matches the commitment 
                  that was published before you provided your client seed.
                </p>
              </div>
              <div className="bg-primary-bg rounded-lg p-4">
                <h4 className="font-semibold text-white mb-2">Step 2: Verify Entropy Derivation</h4>
                <p className="text-sm text-text-secondary">
                  Confirm that the final entropy was correctly derived from the 
                  combination of house seed and your client seed.
                </p>
              </div>
              <div className="bg-primary-bg rounded-lg p-4">
                <h4 className="font-semibold text-white mb-2">Step 3: Verify Result</h4>
                <p className="text-sm text-text-secondary">
                  Apply the entropy-to-position formula and confirm the displayed 
                  symbols match the calculated positions.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="mb-16">
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
            <span className="w-10 h-10 rounded-full bg-purple-600/20 flex items-center justify-center text-purple-400">
              6
            </span>
            Security Guarantees
          </h2>
          <div className="bg-secondary-bg rounded-xl p-6">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-primary-bg rounded-lg p-4">
                <h4 className="font-semibold text-green-400 mb-2">House Cannot Cheat</h4>
                <p className="text-sm text-text-secondary">
                  The commitment is published before knowing your seed. Changing the 
                  house seed would produce a different hash, which you can detect.
                </p>
              </div>
              <div className="bg-primary-bg rounded-lg p-4">
                <h4 className="font-semibold text-green-400 mb-2">Player Cannot Predict</h4>
                <p className="text-sm text-text-secondary">
                  The house seed is generated from chaotic three-body physics. Even 
                  knowing the algorithm, you cannot predict the outcome.
                </p>
              </div>
              <div className="bg-primary-bg rounded-lg p-4">
                <h4 className="font-semibold text-green-400 mb-2">Fully Auditable</h4>
                <p className="text-sm text-text-secondary">
                  Every spin produces a complete verification bundle. Third-party 
                  auditors can verify fairness without trusting the operator.
                </p>
              </div>
              <div className="bg-primary-bg rounded-lg p-4">
                <h4 className="font-semibold text-green-400 mb-2">Open Algorithm</h4>
                <p className="text-sm text-text-secondary">
                  The three-body simulation, seed mixing, and position calculation 
                  are all documented and verifiable. No black boxes.
                </p>
              </div>
            </div>
          </div>
        </section>

        <div className="bg-gradient-to-r from-purple-900/30 to-pink-900/30 rounded-xl p-8 text-center border border-purple-500/30">
          <h3 className="text-2xl font-bold text-white mb-4">Try It Yourself</h3>
          <p className="text-text-secondary mb-6">
            Experience provably fair gaming with our interactive demo. See the 
            commit-reveal protocol in action and verify every spin.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/kiro-demo" className="btn-primary">
              Play Demo
            </Link>
            <Link href="/verify" className="btn-secondary">
              Verify a Spin
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
